"""fix: restore chat_historyDB and seed master tables

chat_historyDB was dropped by dbaea7d3d6f4 migration.
category_masterDB and triage_masterDB were never seeded.

Revision ID: zz0001_fix
Revises: a2934e146b3b
Create Date: 2026-05-22

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "zz0001_fix"
down_revision: Union[str, None] = "a2934e146b3b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(name: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return name in inspector.get_table_names()


def upgrade() -> None:
    # chat_historyDB 복원
    if not _has_table("chat_historyDB"):
        op.create_table(
            "chat_historyDB",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("userid", sa.Integer(), nullable=False),
            sa.Column("petid", sa.Integer(), nullable=False),
            sa.Column("emrid", sa.Integer(), nullable=True),
            sa.Column("messages", sa.JSON(), nullable=True),
            sa.Column("keywords", sa.JSON(), nullable=True),
            sa.Column("is_complete", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.ForeignKeyConstraint(["emrid"], ["guardianDB.emrid"]),
            sa.ForeignKeyConstraint(["petid"], ["petDB.petid"]),
            sa.ForeignKeyConstraint(["userid"], ["userDB.userid"]),
            sa.PrimaryKeyConstraint("id"),
        )

    # category_masterDB 시드 (정기검진·일반진료·긴급진료)
    conn = op.get_bind()
    count = conn.execute(sa.text('SELECT count(*) FROM "category_masterDB"')).scalar()
    if count == 0:
        conn.execute(sa.text("""
            INSERT INTO "category_masterDB" (code, label) VALUES
              (1, '정기검진'), (2, '일반진료'), (3, '긴급진료')
            ON CONFLICT (code) DO NOTHING
        """))

    # triage_masterDB 시드 (Modified VTL 5단계)
    count = conn.execute(sa.text('SELECT count(*) FROM "triage_masterDB"')).scalar()
    if count == 0:
        conn.execute(sa.text("""
            INSERT INTO "triage_masterDB" (code, label) VALUES
              (1, '즉시처치'), (2, '긴급'), (3, '일반'), (4, '비긴급'), (5, '낮음')
            ON CONFLICT (code) DO NOTHING
        """))

    # checkup_date 컬럼 복원 (dbaea7d3d6f4에서 잘못 DROP됨)
    result = conn.execute(sa.text(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='petDB' AND column_name='checkup_date'"
    ))
    if not result.fetchone():
        op.add_column("petDB", sa.Column("checkup_date", sa.Date(), nullable=True))


def downgrade() -> None:
    pass
