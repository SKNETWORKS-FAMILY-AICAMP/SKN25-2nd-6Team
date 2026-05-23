"""테스트 계정 생성 스크립트.

사용법:
  cd backend
  DATABASE_URL=postgresql://medipaw:medipaw_secret@localhost:5432/medipaw \
    python scripts/create_test_accounts.py

생성 계정:
  보호자(guardian): guardian_test / Test1234!
  수의사(vet):      vet_test / Test1234!
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://medipaw:medipaw_secret@localhost:5432/medipaw")
ASYNC_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://").replace("postgresql+psycopg2://", "postgresql+asyncpg://")

from app.core.security import hash_password


async def main():
    engine = create_async_engine(ASYNC_URL, echo=False)
    Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with Session() as db:
        # ── 보호자 계정 ──────────────────────────────
        result = await db.execute(text('SELECT userid FROM "userDB" WHERE loginid = :id'), {"id": "guardian_test"})
        if result.fetchone():
            await db.execute(text("""
                UPDATE "userDB"
                SET password = :pw, name = :name, phone = :phone, updated_at = now()
                WHERE loginid = :loginid
            """), {
                "loginid": "guardian_test",
                "pw": hash_password("Test1234!"),
                "name": "테스트보호자",
                "phone": "010-0000-0001",
            })
            await db.commit()
            print("✅ 보호자 계정 비밀번호 갱신 완료: guardian_test")
        else:
            await db.execute(text("""
                INSERT INTO "userDB" (loginid, password, name, phone, created_at, updated_at)
                VALUES (:loginid, :pw, :name, :phone, now(), now())
            """), {
                "loginid": "guardian_test",
                "pw": hash_password("Test1234!"),
                "name": "테스트보호자",
                "phone": "010-0000-0001",
            })
            await db.commit()
            print("✅ 보호자 계정 생성: guardian_test / Test1234!")

        # ── 반려동물 (보호자에 연결) ─────────────────
        user_row = (await db.execute(
            text('SELECT userid FROM "userDB" WHERE loginid = :id'), {"id": "guardian_test"}
        )).fetchone()
        uid = user_row[0]

        pet_row = (await db.execute(
            text('SELECT petid FROM "petDB" WHERE userid = :uid AND petname = :name'), {"uid": uid, "name": "뽀미"}
        )).fetchone()

        if pet_row:
            print("✅ 반려동물 이미 존재: 뽀미")
        else:
            await db.execute(text("""
                INSERT INTO "petDB" (userid, petname, species, breed, gender, weight_kg, birth_date, is_neutered)
                VALUES (:uid, '뽀미', 'dog', '말티즈', 'female', 3.2, '2021-03-15', true)
            """), {"uid": uid})
            await db.commit()
            print("✅ 반려동물 생성: 뽀미 (말티즈 / 3.2kg)")

        # ── 수의사 계정 ──────────────────────────────
        vet_row = (await db.execute(
            text('SELECT doctorid FROM "doctorDB" WHERE loginid = :id'), {"id": "vet_test"}
        )).fetchone()

        if vet_row:
            await db.execute(text("""
                UPDATE "doctorDB"
                SET password = :pw, doctor_name = :dname, hospital_name = :hname,
                    hospital_address = :haddr, hospital_number = :hnum, updated_at = now()
                WHERE loginid = :loginid
            """), {
                "loginid": "vet_test",
                "pw": hash_password("Test1234!"),
                "dname": "테스트수의사",
                "hname": "MediPaw 동물병원",
                "haddr": "서울시 강남구 테스트로 1",
                "hnum": "02-0000-0001",
            })
            await db.commit()
            print("✅ 수의사 계정 비밀번호 갱신 완료: vet_test")
        else:
            await db.execute(text("""
                INSERT INTO "doctorDB"
                  (loginid, password, is_initial_password, doctor_name, hospital_name,
                   hospital_address, hospital_number, business_number, created_at, updated_at)
                VALUES
                  (:loginid, :pw, false, :dname, :hname, :haddr, :hnum, :bnum, now(), now())
            """), {
                "loginid": "vet_test",
                "pw": hash_password("Test1234!"),
                "dname": "테스트수의사",
                "hname": "MediPaw 동물병원",
                "haddr": "서울시 강남구 테스트로 1",
                "hnum": "02-0000-0001",
                "bnum": "000-00-00001",
            })
            await db.commit()
            print("✅ 수의사 계정 생성: vet_test / Test1234!")

    await engine.dispose()
    print("\n완료! 아래 계정으로 로그인하세요:")
    print("  보호자: http://localhost:5173  →  guardian_test / Test1234!")
    print("  수의사: http://localhost:5174  →  vet_test / Test1234!")


if __name__ == "__main__":
    asyncio.run(main())
