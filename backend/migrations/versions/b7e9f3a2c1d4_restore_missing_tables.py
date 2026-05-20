"""restore missing tables (doctorEMRDB, drugsDB, prescriptionDB, doctor_alarmDB, vet_scheduleDB)

두 head(dbaea7d3d6f4, 7de4bee0478d)를 병합하면서, alembic 상으로는 적용됐다고
기록돼 있지만 실제 DB에서 사라진 5개 테이블을 다시 생성한다.

Revision ID: b7e9f3a2c1d4
Revises: dbaea7d3d6f4, 7de4bee0478d
Create Date: 2026-05-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7e9f3a2c1d4"
down_revision: Union[str, Sequence[str], None] = ("dbaea7d3d6f4", "7de4bee0478d")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return name in inspector.get_table_names()


def upgrade() -> None:
    if not _has_table("drugsDB"):
        op.create_table(
            "drugsDB",
            sa.Column("drugid", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("ingredient_kr", sa.String(), nullable=True),
            sa.Column("dosage", sa.String(), nullable=True),
            sa.Column("usage_method", sa.String(), nullable=True),
            sa.Column("duration_days", sa.Integer(), nullable=True),
            sa.Column("sales_volume", sa.Integer(), nullable=True),
            sa.PrimaryKeyConstraint("drugid"),
        )

    if not _has_table("vet_scheduleDB"):
        op.create_table(
            "vet_scheduleDB",
            sa.Column("vetscheduleid", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("doctorid", sa.Integer(), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("start_time", sa.Time(), nullable=False),
            sa.Column("end_time", sa.Time(), nullable=False),
            sa.Column("is_available", sa.Boolean(), nullable=False),
            sa.ForeignKeyConstraint(["doctorid"], ["doctorDB.doctorid"]),
            sa.PrimaryKeyConstraint("vetscheduleid"),
        )

    if not _has_table("doctorEMRDB"):
        op.create_table(
            "doctorEMRDB",
            sa.Column("doctor_emrid", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("petid", sa.Integer(), nullable=False),
            sa.Column("doctorid", sa.Integer(), nullable=False),
            sa.Column("scheduleid", sa.Integer(), nullable=False),
            sa.Column("vet_note", sa.String(), nullable=True),
            sa.Column("attachments", sa.String(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["doctorid"], ["doctorDB.doctorid"]),
            sa.ForeignKeyConstraint(["petid"], ["petDB.petid"]),
            sa.ForeignKeyConstraint(["scheduleid"], ["scheduleDB.scheduleid"]),
            sa.PrimaryKeyConstraint("doctor_emrid"),
        )

    if not _has_table("doctor_alarmDB"):
        op.create_table(
            "doctor_alarmDB",
            sa.Column("alarmid", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("doctorid", sa.Integer(), nullable=False),
            sa.Column("scheduleid", sa.Integer(), nullable=False),
            sa.Column("type", sa.String(), nullable=False),
            sa.Column("contents", sa.String(), nullable=False),
            sa.Column("is_read", sa.Boolean(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["doctorid"], ["doctorDB.doctorid"]),
            sa.ForeignKeyConstraint(["scheduleid"], ["scheduleDB.scheduleid"]),
            sa.PrimaryKeyConstraint("alarmid"),
        )

    if not _has_table("prescriptionDB"):
        op.create_table(
            "prescriptionDB",
            sa.Column("prescriptionid", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("doctor_emrid", sa.Integer(), nullable=False),
            sa.Column("drug_id", sa.Integer(), nullable=False),
            sa.Column("form", sa.String(), nullable=True),
            sa.Column("dosage", sa.String(), nullable=True),
            sa.Column("duration_days", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["doctor_emrid"], ["doctorEMRDB.doctor_emrid"]),
            sa.ForeignKeyConstraint(["drug_id"], ["drugsDB.drugid"]),
            sa.PrimaryKeyConstraint("prescriptionid"),
        )


def downgrade() -> None:
    for table in (
        "prescriptionDB",
        "doctor_alarmDB",
        "doctorEMRDB",
        "vet_scheduleDB",
        "drugsDB",
    ):
        if _has_table(table):
            op.drop_table(table)
