"""add safe AI/followup schema additions

Revision ID: 9f8fbd8c0bf0
Revises: zz0001_fix
Create Date: 2026-05-23 17:43:58.117957

This revision intentionally contains only additive AI/post-booking fields.
Do not reintroduce autogenerate drift here: business tables such as userDB,
doctorDB, scheduleDB, guardianDB, reportDB, validation_resultDB, and
followupDB must remain canonical production storage.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f8fbd8c0bf0"
down_revision: Union[str, None] = "zz0001_fix"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(table_name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table_name in inspector.get_table_names()


def _has_column(table_name: str, column_name: str) -> bool:
    if not _has_table(table_name):
        return False
    inspector = sa.inspect(op.get_bind())
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    if not _has_table(table_name):
        return False
    inspector = sa.inspect(op.get_bind())
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    # followupDB remains canonical follow-up storage. Add AI result fields only.
    if not _has_column("followupDB", "ai_summary"):
        op.add_column("followupDB", sa.Column("ai_summary", sa.Text(), nullable=True))
    if not _has_column("followupDB", "emergency_alert"):
        op.add_column(
            "followupDB",
            sa.Column("emergency_alert", sa.Boolean(), nullable=True),
        )

    # validation_resultDB remains canonical validation storage.
    # These fields support judge/debug persistence without changing business keys.
    validation_columns = (
        ("raw_llm_output", sa.Text()),
        ("score_breakdown", sa.JSON()),
        ("emr_alignment_reason", sa.Text()),
        ("prescription_risk_reason", sa.Text()),
    )
    for column_name, column_type in validation_columns:
        if not _has_column("validation_resultDB", column_name):
            op.add_column(
                "validation_resultDB",
                sa.Column(column_name, column_type, nullable=True),
            )

    # Optional sidecar snapshot table for experimental agent pipelines.
    # chat_history_id is a correlation/source key only; emrid and scheduleid remain
    # the canonical business keys for episode/reservation flows.
    if not _has_table("agent_pipeline_resultDB"):
        op.create_table(
            "agent_pipeline_resultDB",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("chat_history_id", sa.Integer(), nullable=False),
            sa.Column("userid", sa.Integer(), nullable=False),
            sa.Column("petid", sa.Integer(), nullable=False),
            sa.Column("emrid", sa.Integer(), nullable=True),
            sa.Column("scheduleid", sa.Integer(), nullable=True),
            sa.Column("triage_result", sa.JSON(), nullable=True),
            sa.Column("schedule_result", sa.JSON(), nullable=True),
            sa.Column("chart_result", sa.JSON(), nullable=True),
            sa.Column("validation_result", sa.JSON(), nullable=True),
            sa.Column("judge_result", sa.JSON(), nullable=True),
            sa.Column("retrieval_status", sa.String(), nullable=True),
            sa.Column("rag_confidence", sa.Float(), nullable=True),
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
            sa.ForeignKeyConstraint(["chat_history_id"], ["chat_historyDB.id"]),
            sa.ForeignKeyConstraint(["userid"], ["userDB.userid"]),
            sa.ForeignKeyConstraint(["petid"], ["petDB.petid"]),
            sa.ForeignKeyConstraint(["emrid"], ["guardianDB.emrid"]),
            sa.ForeignKeyConstraint(["scheduleid"], ["scheduleDB.scheduleid"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("chat_history_id"),
        )

    indexes = (
        ("ix_agent_pipeline_resultDB_userid", ["userid"]),
        ("ix_agent_pipeline_resultDB_petid", ["petid"]),
        ("ix_agent_pipeline_resultDB_emrid", ["emrid"]),
        ("ix_agent_pipeline_resultDB_scheduleid", ["scheduleid"]),
    )
    for index_name, columns in indexes:
        if not _has_index("agent_pipeline_resultDB", index_name):
            op.create_index(index_name, "agent_pipeline_resultDB", columns, unique=False)


def downgrade() -> None:
    indexes = (
        "ix_agent_pipeline_resultDB_scheduleid",
        "ix_agent_pipeline_resultDB_emrid",
        "ix_agent_pipeline_resultDB_petid",
        "ix_agent_pipeline_resultDB_userid",
    )
    for index_name in indexes:
        if _has_index("agent_pipeline_resultDB", index_name):
            op.drop_index(index_name, table_name="agent_pipeline_resultDB")

    if _has_table("agent_pipeline_resultDB"):
        op.drop_table("agent_pipeline_resultDB")

    for column_name in (
        "prescription_risk_reason",
        "emr_alignment_reason",
        "score_breakdown",
        "raw_llm_output",
    ):
        if _has_column("validation_resultDB", column_name):
            op.drop_column("validation_resultDB", column_name)

    if _has_column("followupDB", "emergency_alert"):
        op.drop_column("followupDB", "emergency_alert")
    if _has_column("followupDB", "ai_summary"):
        op.drop_column("followupDB", "ai_summary")
