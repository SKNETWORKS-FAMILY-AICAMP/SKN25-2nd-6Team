import asyncio
import traceback
import httpx
from datetime import datetime, timezone, date as date_type
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.db.session import get_db
from app.core.dependencies import get_current_user, get_current_doctor
from app.models.user import User
from app.models.doctor import Doctor
from app.models.pet import Pet
from app.models.schedule import Schedule
from app.models.guardian import Guardian
from app.models.vet_schedule import VetSchedule
from app.models.validation_result import ValidationResult
from app.models.emr import EMR
from app.models.prescription import Prescription
from app.models.drug import Drug
from app.core.config import settings
from ai.tasks import RUNNERS, _task_store

# Mocking Agent Runners to prevent external API calls and ensure deterministic tests
async def mock_triage(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    return {
        "urgency_level": "준긴급",
        "urgency_level_num": 4,
        "chief_complaint": "기침",
        "symptom_onset": "어제부터",
        "symptom_summary": "기침을 계속 함",
        "recommended_action": "내원 권장",
        "need_photo": False
    }

async def mock_schedule(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    return {
        "slot_window": "urgent_24h",
        "estimated_duration_min": 30,
        "pre_visit_instructions": ["금식 4시간"],
        "priority_reason": "지속적 기침으로 빠른 진료 필요"
    }

async def mock_chart(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    return {
        "soap": {
            "subjective": "어제부터 지속적인 기침 및 쌕쌕거림",
            "objective": "청진시 수포음 감지",
            "assessment": "기관지염 의심",
            "plan": "항생제 처방 및 3일 뒤 재진"
        }
    }

async def mock_validation(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    return {
        "overall": "OK",
        "checks": [
            {"item": "정보 일관성", "status": "PASS", "detail": "일치함"},
            {"item": "처방 안전성", "status": "PASS", "detail": "위험 없음"}
        ],
        "scores": {
            "completeness": 9.0,
            "accuracy": 9.0,
            "consistency": 8.5,
            "emr_alignment_score": 9.5,
            "prescription_safety_score": 10.0,
            "scheduling_consistency_score": 9.0
        },
        "emr_alignment_reason": "이전 EMR 피부염 기록과 겹치지 않아 임상적으로 타당함",
        "prescription_risk_reason": "중복 약물 투여 위험 없음",
        "summary": "검증 완료"
    }

async def mock_followup(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    return {
        "medical_summary": "기침 증상 완화 추세",
        "followup_summary": "기침 증상 완화 추세",
        "followup_recommended": False,
        "guardian_message": "기존 예약을 유지하고 경과를 관찰해 주세요.",
        "recommended_actions": ["keep_schedule"]
    }

async def mock_followup_slow(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
    await asyncio.sleep(12.0)  # Exceeds the 10.0s timeout safeguard
    return {
        "medical_summary": "느린 분석",
        "followup_recommended": True,
        "guardian_message": "위험하오니 즉시 내원하세요.",
        "recommended_actions": ["call_hospital"]
    }

RUNNERS["triage"] = mock_triage
RUNNERS["schedule"] = mock_schedule
RUNNERS["chart"] = mock_chart
RUNNERS["validation"] = mock_validation
RUNNERS["followup"] = mock_followup

async def async_setup(db: AsyncSession):
    # Ensure a clean test environment with seed records.
    user_res = await db.execute(select(User).limit(1))
    user = user_res.scalar_one_or_none()
    
    doctor_res = await db.execute(select(Doctor).limit(1))
    doctor = doctor_res.scalar_one_or_none()
    
    if not user or not doctor:
        return None, None, None
        
    # Create or update pet named '보리' (returning) and '초코' (initial)
    pet_returning_res = await db.execute(select(Pet).where(Pet.petname == "보리"))
    pet_returning = pet_returning_res.scalar_one_or_none()
    if not pet_returning:
        pet_returning = Pet(userid=user.userid, petname="보리", species="dog", breed="Maltese", birth_date=date_type(2020, 1, 1), gender="male", weight_kg=4.5, is_neutered=True)
        db.add(pet_returning)
        await db.commit()
        await db.refresh(pet_returning)
        
    pet_initial_res = await db.execute(select(Pet).where(Pet.petname == "초코"))
    pet_initial = pet_initial_res.scalar_one_or_none()
    if not pet_initial:
        pet_initial = Pet(userid=user.userid, petname="초코", species="dog", breed="Poodle", birth_date=date_type(2022, 5, 10), gender="female", weight_kg=3.2, is_neutered=False)
        db.add(pet_initial)
        await db.commit()
        await db.refresh(pet_initial)

    # Clean up previous schedules, guardians and triages for these pets
    pet_ids = [pet_returning.petid, pet_initial.petid]
    emrid_res = await db.execute(text('SELECT emrid FROM "guardianDB" WHERE petid = ANY(:pet_ids)'), {"pet_ids": pet_ids})
    emrids = [r[0] for r in emrid_res.all()]
    if emrids:
        await db.execute(text('DELETE FROM "doctor_alarmDB" WHERE scheduleid IN (SELECT scheduleid FROM "scheduleDB" WHERE emrid = ANY(:emrids))'), {"emrids": emrids})
        await db.execute(text('DELETE FROM "validation_resultDB" WHERE emrid = ANY(:emrids)'), {"emrids": emrids})
        await db.execute(text('DELETE FROM "triage_resultDB" WHERE emrid = ANY(:emrids)'), {"emrids": emrids})
        await db.execute(text('DELETE FROM "reportDB" WHERE emrid = ANY(:emrids)'), {"emrids": emrids})
        await db.execute(text('DELETE FROM "followupDB" WHERE emrid = ANY(:emrids)'), {"emrids": emrids})
        await db.execute(text('DELETE FROM "prescriptionDB" WHERE doctor_emrid IN (SELECT doctor_emrid FROM "doctorEMRDB" WHERE scheduleid IN (SELECT scheduleid FROM "scheduleDB" WHERE emrid = ANY(:emrids)))'), {"emrids": emrids})
        await db.execute(text('DELETE FROM "doctorEMRDB" WHERE scheduleid IN (SELECT scheduleid FROM "scheduleDB" WHERE emrid = ANY(:emrids))'), {"emrids": emrids})
        await db.execute(text('DELETE FROM "scheduleDB" WHERE emrid = ANY(:emrids)'), {"emrids": emrids})
        await db.execute(text('DELETE FROM "guardianDB" WHERE emrid = ANY(:emrids)'), {"emrids": emrids})
        await db.commit()

    # Clean up existing EMR and prescriptions for '보리' and '초코' using doctorEMRDB
    await db.execute(text('DELETE FROM "prescriptionDB" WHERE doctor_emrid IN (SELECT doctor_emrid FROM "doctorEMRDB" WHERE petid = :petid)'), {"petid": pet_returning.petid})
    await db.execute(text('DELETE FROM "doctorEMRDB" WHERE petid = :petid'), {"petid": pet_returning.petid})
    await db.execute(text('DELETE FROM "prescriptionDB" WHERE doctor_emrid IN (SELECT doctor_emrid FROM "doctorEMRDB" WHERE petid = :petid)'), {"petid": pet_initial.petid})
    await db.execute(text('DELETE FROM "doctorEMRDB" WHERE petid = :petid'), {"petid": pet_initial.petid})
    await db.commit()

    # Seed mock drug and EMR history for '보리' (returning pet)
    drug_res = await db.execute(select(Drug).where(Drug.name == "아목시실린"))
    drug = drug_res.scalar_one_or_none()
    if not drug:
        drug = Drug(name="아목시실린", ingredient_kr="아목시실린", ingredient_en="Amoxicillin")
        db.add(drug)
        await db.commit()
        await db.refresh(drug)

    g_hist = Guardian(petid=pet_returning.petid, category_id=1, memo="이전 가려움 진료")
    db.add(g_hist)
    await db.commit()
    await db.refresh(g_hist)

    s_hist = Schedule(emrid=g_hist.emrid, doctorid=doctor.doctorid, confirmed_time=datetime.now(timezone.utc), confirmed_end_time=datetime.now(timezone.utc), status="completed", duration_min=30)
    db.add(s_hist)
    await db.commit()
    await db.refresh(s_hist)

    emr = EMR(petid=pet_returning.petid, doctorid=doctor.doctorid, scheduleid=s_hist.scheduleid, vet_note={"subjective": "피부 가려움", "objective": "발적 있음", "assessment": "Atopic Dermatitis", "plan": "소독 및 약 처방"}, attachments=[])
    db.add(emr)
    await db.commit()
    await db.refresh(emr)

    prescription = Prescription(doctor_emrid=emr.doctor_emrid, drug_id=drug.drugid, dosage="1 tab bid", duration_days=5)
    db.add(prescription)
    await db.commit()

    # Set up vet schedule slot for testing booking
    await db.execute(text('DELETE FROM "vet_scheduleDB" WHERE doctorid = :doc_id'), {"doc_id": doctor.doctorid})
    await db.commit()
    
    target_date = date_type(2026, 6, 5)
    vs1 = VetSchedule(doctorid=doctor.doctorid, date=target_date, start_time=datetime.strptime("14:30:00", "%H:%M:%S").time(), end_time=datetime.strptime("15:00:00", "%H:%M:%S").time(), is_available=True)
    vs2 = VetSchedule(doctorid=doctor.doctorid, date=target_date, start_time=datetime.strptime("15:00:00", "%H:%M:%S").time(), end_time=datetime.strptime("15:30:00", "%H:%M:%S").time(), is_available=True)
    db.add_all([vs1, vs2])
    await db.commit()

    print(f"Setup Complete: User={user.userid}, Doctor={doctor.doctorid}, Returning Pet={pet_returning.petid}, Initial Pet={pet_initial.petid}")
    return user, doctor, {"returning": pet_returning, "initial": pet_initial}

async def run_scenario_tests():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        user, doctor, pets = await async_setup(db)
        if not user or not doctor or not pets:
            print("Failed setup - missing database seed users/doctors!")
            return

        # Cache ID values to prevent lazy-loading issues after expire_all()
        doctor_id = doctor.doctorid
        user_id = user.userid
        returning_pet_id = pets["returning"].petid
        initial_pet_id = pets["initial"].petid

        async def get_mock_user():
            async with async_session() as session:
                res = await session.execute(select(User).where(User.userid == user_id))
                return res.scalar_one()

        async def get_mock_doctor():
            async with async_session() as session:
                res = await session.execute(select(Doctor).where(Doctor.doctorid == doctor_id))
                return res.scalar_one()

        async with httpx.AsyncClient(app=app, base_url="http://test") as client:
            app.dependency_overrides[get_current_user] = get_mock_user
            app.dependency_overrides[get_current_doctor] = get_mock_doctor

            # =========================================================================
            # SCENARIO 7: CORS 크로스 오리진 검증
            # =========================================================================
            print("\n>>> SCENARIO 7: CORS Cross-Origin Headers Verification")
            cors_headers = {
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type"
            }
            cors_resp = await client.options("/pets", headers=cors_headers)
            print(f"OPTIONS /pets CORS response status: {cors_resp.status_code}")
            print(f"CORS header Access-Control-Allow-Origin: {cors_resp.headers.get('Access-Control-Allow-Origin')}")
            assert cors_resp.headers.get("Access-Control-Allow-Origin") in ["http://localhost:5173", "http://localhost:5174", "*"]
            print("[CORS] Successfully verified CORS headers for port 5173!")

            # =========================================================================
            # SCENARIO 1: 초진 일반 예약 검증
            # =========================================================================
            print("\n>>> SCENARIO 1: First Visit General Booking (Initial Visit)")
            # 1. Create guardian & triage
            guard_initial = Guardian(petid=initial_pet_id, category_id=2, date=None, memo="지속적인 기침")
            db.add(guard_initial)
            await db.commit()
            await db.refresh(guard_initial)

            await db.execute(text("""
                INSERT INTO "triage_resultDB" (emrid, urgency_level, urgency_level_num, chief_complaint, symptom_onset, symptom_summary, created_at)
                VALUES (:emrid, '준긴급', 4, '지속적인 기침', '어제부터', '기침을 계속 함', now())
            """), {"emrid": guard_initial.emrid})
            await db.commit()

            # 2. Book reservation via POST /schedules/confirm
            book_resp = await client.post("/schedules/confirm", json={
                "emrid": guard_initial.emrid,
                "doctorid": doctor_id,
                "confirmed_time": "2026-06-05T14:30:00+09:00",
                "duration_min": 30
            })
            print(f"Book status code: {book_resp.status_code}")
            assert book_resp.status_code == 201
            res_data = book_resp.json()["result"]
            schedule_id_initial = res_data["schedule_id"]
            chart_task_id = res_data["chart_task_id"]
            val_task_id = res_data["validation_task_id"]

            # Wait for background AI agents
            print("Waiting for background AI agents (Chart & Validation) to finish...")
            for _ in range(10):
                chart_st = _task_store.get(chart_task_id, {}).get("status")
                val_st = _task_store.get(val_task_id, {}).get("status")
                if chart_st in ("done", "error") and val_st in ("done", "error"):
                    break
                await asyncio.sleep(1)

            # Check DB write
            val_result_initial = (await db.execute(select(ValidationResult).where(ValidationResult.emrid == guard_initial.emrid))).scalar_one_or_none()
            assert val_result_initial is not None
            print(f"[Initial] Validation overall score completeness: {val_result_initial.completeness_score}")
            print(f"[Initial] Raw LLM Output saved length: {len(val_result_initial.raw_llm_output)}")
            assert val_result_initial.overall == "OK"
            print("[SCENARIO 1] First visit booking successfully verified!")

            # =========================================================================
            # SCENARIO 2: 재진 예약 검증 (EMR History Context)
            # =========================================================================
            print("\n>>> SCENARIO 2: Returning Visit Booking (EMR Context injection)")
            # 1. Create guardian & triage
            guard_returning = Guardian(petid=returning_pet_id, category_id=2, date=None, memo="피부 가려움 재발")
            db.add(guard_returning)
            await db.commit()
            await db.refresh(guard_returning)

            await db.execute(text("""
                INSERT INTO "triage_resultDB" (emrid, urgency_level, urgency_level_num, chief_complaint, symptom_onset, symptom_summary, created_at)
                VALUES (:emrid, '일반', 2, '피부 가려움', '3일 전부터', '피부 가려움 재발', now())
            """), {"emrid": guard_returning.emrid})
            await db.commit()

            # 2. Book reservation via POST /schedules/confirm
            book_resp2 = await client.post("/schedules/confirm", json={
                "emrid": guard_returning.emrid,
                "doctorid": doctor_id,
                "confirmed_time": "2026-06-05T15:00:00+09:00",
                "duration_min": 30
            })
            print(f"Book status code: {book_resp2.status_code}")
            assert book_resp2.status_code == 201
            res_data2 = book_resp2.json()["result"]
            schedule_id_returning = res_data2["schedule_id"]
            chart_task_id2 = res_data2["chart_task_id"]
            val_task_id2 = res_data2["validation_task_id"]

            # Wait for background AI agents
            print("Waiting for background AI agents (Chart & Validation) to finish...")
            for _ in range(10):
                chart_st = _task_store.get(chart_task_id2, {}).get("status")
                val_st = _task_store.get(val_task_id2, {}).get("status")
                if chart_st in ("done", "error") and val_st in ("done", "error"):
                    break
                await asyncio.sleep(1)

            # Check DB write
            val_result_returning = (await db.execute(select(ValidationResult).where(ValidationResult.emrid == guard_returning.emrid))).scalar_one_or_none()
            assert val_result_returning is not None
            print(f"[Returning] EMR Alignment Reason: {val_result_returning.emr_alignment_reason}")
            print(f"[Returning] Prescription Risk Reason: {val_result_returning.prescription_risk_reason}")
            assert val_result_returning.emr_alignment_reason != ""
            assert val_result_returning.prescription_risk_reason != ""
            print("[SCENARIO 2] Returning visit booking successfully verified!")

            # =========================================================================
            # SCENARIO 3: Follow-up Escalation & Timeout Safeguard
            # =========================================================================
            print("\n>>> SCENARIO 3: Follow-up Escalation & Timeout Safeguard")
            # First, test standard followup (success case)
            follow_resp = await client.post("/followup", json={
                "emrid": guard_returning.emrid,
                "images": [],
                "message": "피부 증상이 점점 가라앉고 있습니다."
            })
            print(f"Follow-up Success case status: {follow_resp.status_code}")
            assert follow_resp.status_code == 201
            follow_data = follow_resp.json()["result"]
            print(f"Follow-up Response: {follow_data.get('guardian_message')}")
            assert "기존 예약" in follow_data.get("guardian_message") or "기록" in follow_data.get("guardian_message")

            # Second, test timeout safeguard by mocking a slow runner
            print("Testing 10s timeout safeguard (Mocking slow agent)...")
            RUNNERS["followup"] = mock_followup_slow
            
            timeout_resp = await client.post("/followup", json={
                "emrid": guard_returning.emrid,
                "images": [],
                "message": "가려움이 심해지고 진물이 납니다."
            })
            print(f"Follow-up Timeout case status: {timeout_resp.status_code}")
            assert timeout_resp.status_code == 201
            timeout_data = timeout_resp.json()["result"]
            print(f"Timeout fallback message: {timeout_data.get('guardian_message')}")
            assert "분석 시간이 지연되고 있으나" in timeout_data.get("guardian_message")
            print("[SCENARIO 3] Follow-up escalation & timeout fallback successfully verified!")

            # Restore normal followup runner
            RUNNERS["followup"] = mock_followup

            # =========================================================================
            # SCENARIO 4: 예약 취소 후 슬롯 복구 검증
            # =========================================================================
            print("\n>>> SCENARIO 4: Reservation Cancellation & Slot Restoration")
            # 1. Verify that slot was booked (is_available = False)
            db.expire_all()
            vs1_check = (await db.execute(select(VetSchedule).where(
                VetSchedule.doctorid == doctor_id,
                VetSchedule.date == date_type(2026, 6, 5),
                VetSchedule.start_time == datetime.strptime("14:30:00", "%H:%M:%S").time()
            ))).scalar_one()
            print(f"Before cancel, slot is_available: {vs1_check.is_available}")
            assert vs1_check.is_available is False

            # 2. Cancel reservation
            cancel_resp = await client.delete(f"/doctor/reservations/{schedule_id_initial}")
            print(f"Cancel response status: {cancel_resp.status_code}")
            assert cancel_resp.status_code == 200

            # 3. Verify slot is available again (is_available = True)
            db.expire_all()
            vs1_check2 = (await db.execute(select(VetSchedule).where(
                VetSchedule.doctorid == doctor_id,
                VetSchedule.date == date_type(2026, 6, 5),
                VetSchedule.start_time == datetime.strptime("14:30:00", "%H:%M:%S").time()
            ))).scalar_one()
            print(f"After cancel, slot is_available: {vs1_check2.is_available}")
            assert vs1_check2.is_available is True
            print("[SCENARIO 4] Slot restoration after reservation cancel successfully verified!")

            # =========================================================================
            # SCENARIO 5: Validation Failure (Checks & Warnings)
            # =========================================================================
            print("\n>>> SCENARIO 5: Validation Failure (Checks & Warnings)")
            # Set mock validation runner to return Warning / Mismatch
            async def mock_validation_warning(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
                return {
                    "overall": "WARNING",
                    "checks": [
                        {"item": "정보 일관성", "status": "WARN", "detail": "중복 약물 처방 가능성 높음"},
                        {"item": "일정 충돌", "status": "PASS", "detail": "적절함"}
                    ],
                    "scores": {
                        "completeness": 9.0,
                        "accuracy": 8.0,
                        "consistency": 7.0,
                        "emr_alignment_score": 5.0,
                        "prescription_safety_score": 4.0,
                        "scheduling_consistency_score": 9.0
                    },
                    "emr_alignment_reason": "경고: 아목시실린 중복 처방 가능성 감지",
                    "prescription_risk_reason": "경고: 동일 계열 항생제 중복 처방 위험",
                    "summary": "처방 일관성 오류 및 중복 처방 위험 발견"
                }
            RUNNERS["validation"] = mock_validation_warning

            # Book reservation
            guard_warn = Guardian(petid=returning_pet_id, category_id=2, date=None, memo="동일 가려움")
            db.add(guard_warn)
            await db.commit()
            await db.refresh(guard_warn)

            await db.execute(text("""
                INSERT INTO "triage_resultDB" (emrid, urgency_level, urgency_level_num, chief_complaint, symptom_onset, symptom_summary, created_at)
                VALUES (:emrid, '일반', 2, '가려움', '1일 전부터', '가려움 재발', now())
            """), {"emrid": guard_warn.emrid})
            await db.commit()

            book_resp3 = await client.post("/schedules/confirm", json={
                "emrid": guard_warn.emrid,
                "doctorid": doctor_id,
                "confirmed_time": "2026-06-05T14:30:00+09:00",
                "duration_min": 30
            })
            res_data3 = book_resp3.json()["result"]
            val_task_id3 = res_data3["validation_task_id"]

            for _ in range(10):
                if _task_store.get(val_task_id3, {}).get("status") in ("done", "error"):
                    break
                await asyncio.sleep(1)

            val_result_warn = (await db.execute(select(ValidationResult).where(ValidationResult.emrid == guard_warn.emrid))).scalar_one_or_none()
            assert val_result_warn is not None
            print(f"Warning validation checks: {val_result_warn.checks}")
            print(f"Warning overall rating: {val_result_warn.overall}")
            assert val_result_warn.overall == "WARNING"
            
            # Cancel Scenario 5 reservation to free 14:30 slot for Scenario 6
            cancel_resp_warn = await client.delete(f"/doctor/reservations/{res_data3['schedule_id']}")
            assert cancel_resp_warn.status_code == 200
            print("[SCENARIO 5] Validation warnings and checks successfully verified!")

            # Restore normal mock validation
            RUNNERS["validation"] = mock_validation

            # =========================================================================
            # SCENARIO 6: Background Agent Failure Isolation
            # =========================================================================
            print("\n>>> SCENARIO 6: Background Agent Failure Isolation")
            # Mock chart agent to crash
            async def mock_chart_crash(payload: dict, update_step, emrid: int | None, scheduleid: int | None) -> dict:
                raise ValueError("Simulated Chart Agent failure")
            RUNNERS["chart"] = mock_chart_crash

            # Book reservation
            guard_crash = Guardian(petid=initial_pet_id, category_id=2, date=None, memo="기침 테스트")
            db.add(guard_crash)
            await db.commit()
            await db.refresh(guard_crash)

            await db.execute(text("""
                INSERT INTO "triage_resultDB" (emrid, urgency_level, urgency_level_num, chief_complaint, symptom_onset, symptom_summary, created_at)
                VALUES (:emrid, '준긴급', 4, '기침', '3일전', '기침 심해짐', now())
            """), {"emrid": guard_crash.emrid})
            await db.commit()

            # Confirm reservation must succeed (commit happens on transaction thread)
            book_resp4 = await client.post("/schedules/confirm", json={
                "emrid": guard_crash.emrid,
                "doctorid": doctor_id,
                "confirmed_time": "2026-06-05T14:30:00+09:00",
                "duration_min": 30
            })
            print(f"Crash test confirm booking status: {book_resp4.status_code}")
            assert book_resp4.status_code == 201  # Reservation must be created and returned successfully
            
            res_data4 = book_resp4.json()["result"]
            chart_task_id4 = res_data4["chart_task_id"]
            val_task_id4 = res_data4["validation_task_id"]

            for _ in range(10):
                chart_st = _task_store.get(chart_task_id4, {}).get("status")
                val_st = _task_store.get(val_task_id4, {}).get("status")
                if chart_st in ("done", "error") and val_st in ("done", "error"):
                    break
                await asyncio.sleep(1)

            print(f"Chart BG task status: {_task_store.get(chart_task_id4, {}).get('status')}")
            print(f"Validation BG task status: {_task_store.get(val_task_id4, {}).get('status')}")
            assert _task_store.get(chart_task_id4, {}).get("status") == "error"
            assert _task_store.get(val_task_id4, {}).get("status") == "done"
            
            # Check database: reservation should still exist (it's safe)
            db.expire_all()
            sched_check = (await db.execute(select(Schedule).where(Schedule.scheduleid == res_data4["schedule_id"]))).scalar_one_or_none()
            assert sched_check is not None
            print(f"Reservation scheduleid={sched_check.scheduleid} status={sched_check.status} remains intact despite background agent failure!")
            print("[SCENARIO 6] Background agent failure isolation successfully verified!")

            # Clean up overrides
            app.dependency_overrides.clear()

if __name__ == "__main__":
    print("Starting MediPaw Stabilization End-to-End Suite...")
    try:
        asyncio.run(run_scenario_tests())
        print("\nALL STABILIZATION SCENARIOS SUCCESSFULLY VERIFIED!")
    except Exception as e:
        print("\nSTABILIZATION TEST RUN FAILED:")
        traceback.print_exc()
        sys.exit(1)
