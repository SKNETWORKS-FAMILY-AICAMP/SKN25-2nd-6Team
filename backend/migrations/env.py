"""Alembic 마이그레이션 환경 설정.

설계 원칙:
  - Alembic은 동기 드라이버(psycopg2)로 실행한다.
    asyncpg는 런타임 전용이며, Alembic CLI는 항상 동기 psycopg2를 사용한다.
  - DATABASE_URL에 postgresql+asyncpg:// 스킴이 있으면 postgresql://으로 변환한다.
  - asyncpg 연결의 prepared_statement_cache_size=0 설정은 마이그레이션과 무관하다.
    (Alembic은 NullPool + 동기 연결을 사용하므로 캐시 이슈 없음)

마이그레이션 워크플로우 (개발 환경):
  # develop 브랜치 기준으로만 생성 (기능 브랜치 금지)
  cd backend

  # 1. 새 revision 생성 (자동 감지)
  alembic revision --autogenerate -m "add_column_description"

  # 2. 내용 검토 후 적용
  alembic upgrade head

  # 3. 롤백 (1단계)
  alembic downgrade -1

  # 4. 현재 상태 확인
  alembic current
  alembic history --verbose

네이밍 컨벤션:
  add_<table>_<column>    예) add_pet_microchip_id
  alter_<table>_<column>  예) alter_guardian_memo_to_text
  create_<table>          예) create_photo_analysis
  drop_<table>            예) drop_legacy_queue
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db.base import Base
from app.core.config import settings

# 모든 모델을 임포트해야 Base.metadata가 완전히 구성된다.
# 새 모델 추가 시 반드시 여기에도 추가할 것.
from app.models.user import User                        # noqa: F401
from app.models.doctor import Doctor                    # noqa: F401
from app.models.pet import Pet                          # noqa: F401
from app.models.guardian import Guardian                # noqa: F401
from app.models.schedule import Schedule                # noqa: F401
from app.models.master import TriageMaster, CategoryMaster  # noqa: F401
from app.models.chat_history import ChatHistory         # noqa: F401
from app.models.alarm import DoctorAlarm                # noqa: F401
from app.models.drug import Drug                        # noqa: F401
from app.models.prescription import Prescription        # noqa: F401
from app.models.vet_schedule import VetSchedule         # noqa: F401
from app.models.emr import EMR                          # noqa: F401
from app.models.report import Report                    # noqa: F401
from app.models.triage_result import TriageResult       # noqa: F401
from app.models.photo_analysis import PhotoAnalysis     # noqa: F401
from app.models.validation_result import ValidationResult  # noqa: F401
from app.models.followup import Followup                # noqa: F401
from app.models.hospital import Hospital                # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _sync_url(url: str) -> str:
    """asyncpg URL을 psycopg2 동기 URL로 변환한다."""
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if url.startswith("postgresql+psycopg2://"):
        return url  # 이미 동기 드라이버
    return url


def run_migrations_offline() -> None:
    """SQL 파일로 마이그레이션을 출력한다 (DB 연결 없이)."""
    url = _sync_url(settings.DATABASE_URL)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # 컬럼 타입 변경 비교 활성화
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """실제 DB에 연결하여 마이그레이션을 실행한다."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _sync_url(settings.DATABASE_URL)

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # Alembic은 단일 연결로 충분
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # 컬럼 타입 변경 비교 활성화 (nullable 변경 등 자동 감지)
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()