from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.base import Base
from app.core.config import settings 

from app.models.user import User
from app.models.doctor import Doctor
from app.models.pet import Pet
from app.models.guardian import Guardian
from app.models.schedule import Schedule
from app.models.master import TriageMaster, CategoryMaster
from app.models.chat_history import ChatHistory
from app.models.alarm import DoctorAlarm
from app.models.drug import Drug
from app.models.prescription import Prescription
from app.models.vet_schedule import VetSchedule
from app.models.emr import EMR
from app.models.report import Report
from app.models.triage_result import TriageResult
from app.models.photo_analysis import PhotoAnalysis
from app.models.validation_result import ValidationResult

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = settings.DATABASE_URL  # 수정
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.DATABASE_URL  # 추가

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()