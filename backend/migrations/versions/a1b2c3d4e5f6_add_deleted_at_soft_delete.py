"""add deleted_at for soft delete on scheduleDB and guardianDB

Revision ID: a1b2c3d4e5f6
Revises: b7e9f3a2c1d4
Create Date: 2026-05-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "b7e9f3a2c1d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(conn, table: str, column: str) -> bool:
    result = conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :table AND column_name = :column"
        ),
        {"table": table, "column": column},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()
    for table in ("scheduleDB", "guardianDB"):
        if not _has_column(conn, table, "deleted_at"):
            op.add_column(
                table,
                sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            )


def downgrade() -> None:
    op.drop_column("guardianDB", "deleted_at")
    op.drop_column("scheduleDB", "deleted_at")
