import asyncio
import os
import sys
import json
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parents[1]))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://medipaw:medipaw123@localhost:5432/medipaw")
ASYNC_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://").replace("postgresql+psycopg2://", "postgresql+asyncpg://")

async def main():
    engine = create_async_engine(ASYNC_URL, echo=False)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:
        # Get guardian_test petid
        user_row = (await db.execute(
            text('SELECT userid FROM "userDB" WHERE loginid = :id'), {"id": "guardian_test"}
        )).fetchone()
        if not user_row:
            print("❌ guardian_test가 없습니다. create_test_accounts.py를 먼저 실행하세요.")
            return
        uid = user_row[0]

        pet_row = (await db.execute(
            text('SELECT petid FROM "petDB" WHERE userid = :uid AND petname = :name'), {"uid": uid, "name": "뽀미"}
        )).fetchone()
        if not pet_row:
            print("❌ 뽀미가 없습니다.")
            return
        petid = pet_row[0]

        # Get vet_test doctorid
        vet_row = (await db.execute(
            text('SELECT doctorid FROM "doctorDB" WHERE loginid = :id'), {"id": "vet_test"}
        )).fetchone()
        if not vet_row:
            print("❌ vet_test가 없습니다.")
            return
        doctorid = vet_row[0]

        # Clear existing mock EMR records for this pet first to avoid duplicates
        # Delete prescription first, then doctorEMRDB, then scheduleDB, then guardianDB
        await db.execute(text("""
            DELETE FROM "prescriptionDB" WHERE doctor_emrid IN (
                SELECT doctor_emrid FROM "doctorEMRDB" WHERE petid = :petid
            )
        """), {"petid": petid})
        await db.execute(text('DELETE FROM "doctorEMRDB" WHERE petid = :petid'), {"petid": petid})
        await db.execute(text("""
            DELETE FROM "scheduleDB" WHERE emrid IN (
                SELECT emrid FROM "guardianDB" WHERE petid = :petid
            )
        """), {"petid": petid})
        await db.execute(text('DELETE FROM "guardianDB" WHERE petid = :petid'), {"petid": petid})
        await db.commit()

        # Insert 1st EMR (skin disease, 40 days ago)
        date1 = datetime.now() - timedelta(days=40)
        res_g1 = await db.execute(text("""
            INSERT INTO "guardianDB" (petid, category_id, triage_id, date, memo, created_at)
            VALUES (:petid, 3, 3, :date, '발끝을 핥고 붉어짐', :created_at)
            RETURNING emrid
        """), {
            "petid": petid,
            "date": date1.date(),
            "created_at": date1
        })
        emrid1 = res_g1.fetchone()[0]

        res_s1 = await db.execute(text("""
            INSERT INTO "scheduleDB" (emrid, doctorid, duration_min, confirmed_time, confirmed_end_time, status, created_at, updated_at)
            VALUES (:emrid, :doctorid, 30, :confirmed_time, :confirmed_end_time, '진료완료', :created_at, :created_at)
            RETURNING scheduleid
        """), {
            "emrid": emrid1,
            "doctorid": doctorid,
            "confirmed_time": date1 - timedelta(hours=2),
            "confirmed_end_time": date1 - timedelta(hours=1, minutes=30),
            "created_at": date1
        })
        sched_id1 = res_s1.fetchone()[0]

        vet_memo_1 = {
            "subjective": "피부 가려움증 호소. 발끝을 핥고 붉어짐 발견.",
            "objective": "양측 지간부 발적 및 탈모 확인. 외이염 동반.",
            "assessment": "아토피성 피부염 의심 및 알레르기성 지간피부염.",
            "plan": "약물 처방 및 사료 교체 권고."
        }
        res_e1 = await db.execute(text("""
            INSERT INTO "doctorEMRDB" (petid, doctorid, scheduleid, vet_memo, attachments, created_at, updated_at)
            VALUES (:petid, :doctorid, :scheduleid, :vet_memo, '[]', :created_at, :created_at)
            RETURNING doctor_emrid
        """), {
            "petid": petid,
            "doctorid": doctorid,
            "scheduleid": sched_id1,
            "vet_memo": json.dumps(vet_memo_1),
            "created_at": date1
        })
        emrid1_doc = res_e1.fetchone()[0]

        # Prescription for EMR 1 (drug_id 2 = Polypenject 20)
        await db.execute(text("""
            INSERT INTO "prescriptionDB" (doctor_emrid, drug_id, form, dosage, duration_days)
            VALUES (:emrid, 2, 'PO', '200mg BID', 7)
        """), {"emrid": emrid1_doc})

        # Insert 2nd EMR (vomiting, 20 days ago)
        date2 = datetime.now() - timedelta(days=20)
        res_g2 = await db.execute(text("""
            INSERT INTO "guardianDB" (petid, category_id, triage_id, date, memo, created_at)
            VALUES (:petid, 1, 3, :date, '지속적인 구토 증상', :created_at)
            RETURNING emrid
        """), {
            "petid": petid,
            "date": date2.date(),
            "created_at": date2
        })
        emrid2 = res_g2.fetchone()[0]

        res_s2 = await db.execute(text("""
            INSERT INTO "scheduleDB" (emrid, doctorid, duration_min, confirmed_time, confirmed_end_time, status, created_at, updated_at)
            VALUES (:emrid, :doctorid, 30, :confirmed_time, :confirmed_end_time, '진료완료', :created_at, :created_at)
            RETURNING scheduleid
        """), {
            "emrid": emrid2,
            "doctorid": doctorid,
            "confirmed_time": date2 - timedelta(hours=2),
            "confirmed_end_time": date2 - timedelta(hours=1, minutes=30),
            "created_at": date2
        })
        sched_id2 = res_s2.fetchone()[0]

        vet_memo_2 = {
            "subjective": "반복적인 구토 증상.",
            "objective": "복부 촉진 시 약한 통증 반응 있으나 활력 양호.",
            "assessment": "급성 위장관염(GE).",
            "plan": "진토제 처방 및 1일 금식."
        }
        res_e2 = await db.execute(text("""
            INSERT INTO "doctorEMRDB" (petid, doctorid, scheduleid, vet_memo, attachments, created_at, updated_at)
            VALUES (:petid, :doctorid, :scheduleid, :vet_memo, '[]', :created_at, :created_at)
            RETURNING doctor_emrid
        """), {
            "petid": petid,
            "doctorid": doctorid,
            "scheduleid": sched_id2,
            "vet_memo": json.dumps(vet_memo_2),
            "created_at": date2
        })
        emrid2_doc = res_e2.fetchone()[0]

        # Prescription for EMR 2 (drug_id 17 = Vomisal)
        await db.execute(text("""
            INSERT INTO "prescriptionDB" (doctor_emrid, drug_id, form, dosage, duration_days)
            VALUES (:emrid, 17, 'PO', '1.5ml BID', 3)
        """), {"emrid": emrid2_doc})

        await db.commit()
        print("✅ 뽀미에 대한 과거 진료이력 mock EMR 및 처방 데이터 생성 완료!")

if __name__ == "__main__":
    asyncio.run(main())
