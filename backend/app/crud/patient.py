from sqlalchemy import or_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pet import Pet
from app.models.user import User
from app.models.emr import EMR
from app.models.schedule import Schedule
from app.models.doctor import Doctor
from app.models.prescription import Prescription
from app.models.drug import Drug


async def get_patient_list(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 10,
    keyword: str | None = None,
    species: str | None = None,
):
    base = select(Pet, User).join(User, Pet.userid == User.userid)

    if keyword:
        like = f"%{keyword}%"
        base = base.where(
            or_(Pet.petname.ilike(like), User.name.ilike(like))
        )

    if species:
        base = base.where(Pet.species == species)

    # 전체 건수
    count_stmt = select(func.count()).select_from(base.subquery())
    total_count = (await db.execute(count_stmt)).scalar_one()

    # 페이지 데이터
    rows_stmt = (
        base.order_by(Pet.petid.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(rows_stmt)).all()

    return rows, total_count


async def get_last_visit_map(db: AsyncSession, pet_ids: list[int]):
    """여러 반려동물의 마지막 방문일을 한 번의 쿼리로 조회한다(N+1 방지).

    소프트 삭제된 예약(scheduleDB.deleted_at)은 방문 이력에서 제외한다.
    """
    if not pet_ids:
        return {}

    result = await db.execute(
        select(EMR.petid, func.max(Schedule.confirmed_time))
        .join(Schedule, EMR.scheduleid == Schedule.scheduleid)
        .where(EMR.petid.in_(pet_ids))
        .where(Schedule.deleted_at.is_(None))
        .group_by(EMR.petid)
    )
    return {petid: last_visit for petid, last_visit in result.all()}


async def get_patient_detail(db: AsyncSession, petid: int):
    result = await db.execute(
        select(Pet, User)
        .join(User, Pet.userid == User.userid)
        .where(Pet.petid == petid)
    )
    return result.first()


async def get_patient_emr_history(db: AsyncSession, petid: int):
    """환자의 진료 이력. 소프트 삭제된 예약은 제외한다."""
    result = await db.execute(
        select(EMR, Doctor, Schedule)
        .join(Doctor, EMR.doctorid == Doctor.doctorid)
        .join(Schedule, EMR.scheduleid == Schedule.scheduleid)
        .where(EMR.petid == petid)
        .where(Schedule.deleted_at.is_(None))
        .order_by(EMR.created_at.desc())
    )
    return result.all()


async def get_prescriptions_by_emr(db: AsyncSession, doctor_emrid: int):
    result = await db.execute(
        select(Prescription, Drug)
        .join(Drug, Prescription.drug_id == Drug.drugid)
        .where(Prescription.doctor_emrid == doctor_emrid)
    )
    return result.all()


async def update_patient(db: AsyncSession, pet: Pet, updates: dict):
    for key, value in updates.items():
        setattr(pet, key, value)

    await db.commit()
    await db.refresh(pet)

    return pet
