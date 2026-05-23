from datetime import date, datetime, time, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import Schedule
from app.models.guardian import Guardian
from app.models.pet import Pet
from app.models.user import User
from app.models.doctor import Doctor
from app.models.emr import EMR
from app.models.triage_result import TriageResult
from app.models.chat_history import ChatHistory
from app.models.prescription import Prescription
from app.models.drug import Drug
from app.models.report import Report
from app.models.validation_result import ValidationResult
from app.utils.timezone import KST, to_kst


def _urgency_to_triage_status(urgency_num: Optional[int]) -> str:
    if urgency_num in (1, 2):
        return "emergency"
    if urgency_num == 3:
        return "semiEmergency"
    return "normal"


def _calc_age(birth_date) -> int:
    if not birth_date:
        return 0
    today = date.today()
    return today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )


async def get_emr_queue(
    db: AsyncSession,
    doctor_id: int,
    target_date: date,
):
    """오늘의 대기/완료 큐를 반환한다.

    confirmed_time은 UTC로 저장되므로 KST 기준 하루 범위로 필터링한다.
    """
    # KST 기준 하루 범위를 UTC로 변환
    kst_start = datetime.combine(target_date, time.min).replace(tzinfo=KST)
    kst_end = kst_start + timedelta(days=1)

    result = await db.execute(
        select(Schedule, Guardian, Pet, User, TriageResult)
        .join(Guardian, Schedule.emrid == Guardian.emrid)
        .join(Pet, Guardian.petid == Pet.petid)
        .join(User, Pet.userid == User.userid)
        .outerjoin(TriageResult, Guardian.emrid == TriageResult.emrid)
        .where(Schedule.doctorid == doctor_id)
        .where(Schedule.confirmed_time >= kst_start)
        .where(Schedule.confirmed_time < kst_end)
        .where(Schedule.deleted_at.is_(None))
        .where(Guardian.deleted_at.is_(None))
        .order_by(Schedule.confirmed_time.asc())
    )
    rows = result.all()

    waiting = []
    completed = []

    for schedule, guardian, pet, user, triage in rows:
        ct = to_kst(schedule.confirmed_time)
        item = {
            "schedule_id": schedule.scheduleid,
            "emrid": guardian.emrid,
            "time": ct.strftime("%H:%M") if ct else "-",
            "guardian_name": user.name,
            "pet_name": pet.petname,
            "species": pet.breed or pet.species or "",
            "breed": pet.breed or "",
            "triage_status": _urgency_to_triage_status(
                triage.urgency_level_num if triage else None
            ),
            "source": "reservation",
        }
        if schedule.status == "진료완료":
            completed.append(item)
        else:
            waiting.append(item)

    return waiting, completed


async def get_emr_detail(db: AsyncSession, schedule_id: int):
    """schedule_id 기준 EMR 상세 정보.

    환자 정보 + 트리아지 요약 + 과거 EMR 히스토리를 반환한다.
    """
    # Step 1: schedule → guardian → pet → user
    row = (await db.execute(
        select(Schedule, Guardian, Pet, User)
        .join(Guardian, Schedule.emrid == Guardian.emrid)
        .join(Pet, Guardian.petid == Pet.petid)
        .join(User, Pet.userid == User.userid)
        .where(Schedule.scheduleid == schedule_id)
        .where(Schedule.deleted_at.is_(None))
    )).first()

    if not row:
        return None

    schedule, guardian, pet, user = row
    emrid = guardian.emrid

    # Step 2: triage_result
    triage = (await db.execute(
        select(TriageResult).where(TriageResult.emrid == emrid)
    )).scalar_one_or_none()

    # Step 3: chat_history → image attachments
    chat = (await db.execute(
        select(ChatHistory).where(
            ChatHistory.emrid == emrid,
            ChatHistory.is_deleted.is_(False),
        )
    )).scalar_one_or_none()

    attachments: list[str] = []
    if chat and chat.messages:
        for msg in chat.messages:
            url = msg.get("image_url") if isinstance(msg, dict) else None
            if url:
                attachments.append(url)

    # Step 4: triage_summary.summary 구성
    summary: list[str] = []
    if triage:
        if triage.symptom_summary:
            summary.append(triage.symptom_summary)
        if triage.symptom_keywords:
            kws = triage.symptom_keywords
            if isinstance(kws, list) and kws:
                summary.append(f"주요 증상: {', '.join(kws)}")
        if triage.suspected_diseases:
            diseases = triage.suspected_diseases
            if isinstance(diseases, list) and diseases:
                summary.append(f"의심 질환: {', '.join(diseases)}")

    # Step 5: 과거 EMR 히스토리 (이 반려동물의 전체 진료 기록)
    emr_rows = (await db.execute(
        select(EMR, Doctor)
        .join(Doctor, EMR.doctorid == Doctor.doctorid)
        .where(EMR.petid == pet.petid)
        .order_by(EMR.created_at.desc())
    )).all()

    emr_history = []
    for emr, doctor in emr_rows:
        rx_rows = (await db.execute(
            select(Prescription, Drug)
            .join(Drug, Prescription.drug_id == Drug.drugid)
            .where(Prescription.doctor_emrid == emr.doctor_emrid)
        )).all()

        visit_dt = to_kst(emr.created_at)
        emr_history.append({
            "emr_id": emr.doctor_emrid,
            "date": visit_dt.date().isoformat() if visit_dt else "",
            "doctor_name": doctor.doctor_name,
            "vet_memo": emr.vet_note or "",
            "prescriptions": [
                {
                    "drug_name": drug.name,
                    "dosage": rx.dosage or "",
                    "form": rx.form or "PO",
                    "frequency": "",
                    "duration_days": rx.duration_days or 0,
                }
                for rx, drug in rx_rows
            ],
        })

    last_visit = emr_history[0]["date"] if emr_history else "첫 내원"

    return {
        "pet_info": {
            "pet_id": pet.petid,
            "pet_name": pet.petname,
            "species": pet.breed or pet.species or "",
            "gender": "Female" if pet.gender == "female" else "Male",
            "weight_kg": float(pet.weight_kg) if pet.weight_kg else 0.0,
            "age": _calc_age(pet.birth_date),
            "birth_date": pet.birth_date.isoformat() if pet.birth_date else "",
            "is_neutered": bool(pet.is_neutered) if pet.is_neutered is not None else False,
            "notes": pet.notes or "",
            "profile_image": pet.profile_image or "",
            "last_visit": last_visit,
        },
        "triage_summary": {
            "summary": summary,
            "attachments": attachments,
            "memo": guardian.memo or None,
        },
        "emr_history": emr_history,
    }


async def get_schedule_emrid(db: AsyncSession, schedule_id: int) -> Optional[int]:
    """schedule_id → emrid 조회 헬퍼."""
    row = (await db.execute(
        select(Schedule.emrid).where(
            Schedule.scheduleid == schedule_id,
            Schedule.deleted_at.is_(None),
        )
    )).first()
    return row[0] if row else None


async def get_report_by_schedule(db: AsyncSession, schedule_id: int):
    emrid = await get_schedule_emrid(db, schedule_id)
    if emrid is None:
        return None
    return (await db.execute(
        select(Report)
        .where((Report.scheduleid == schedule_id) | (Report.emrid == emrid))
        .order_by(Report.reportid.desc())
        .limit(1)
    )).scalar_one_or_none()


async def get_triage_by_schedule(db: AsyncSession, schedule_id: int):
    emrid = await get_schedule_emrid(db, schedule_id)
    if emrid is None:
        return None
    return (await db.execute(
        select(TriageResult).where(TriageResult.emrid == emrid)
    )).scalar_one_or_none()


async def get_validation_by_schedule(db: AsyncSession, schedule_id: int):
    emrid = await get_schedule_emrid(db, schedule_id)
    if emrid is None:
        return None
    return (await db.execute(
        select(ValidationResult)
        .where(
            (ValidationResult.scheduleid == schedule_id)
            | (ValidationResult.emrid == emrid)
        )
        .order_by(ValidationResult.id.desc())
        .limit(1)
    )).scalar_one_or_none()
