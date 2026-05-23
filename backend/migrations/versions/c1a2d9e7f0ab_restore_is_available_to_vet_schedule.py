"""restore is_available column to vet_scheduleDB

Revision ID: c1a2d9e7f0ab
Revises: 9f8fbd8c0bf0
Create Date: 2026-05-23 23:35:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c1a2d9e7f0ab"
down_revision: Union[str, None] = "9f8fbd8c0bf0"
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


def upgrade() -> None:
    if not _has_column("vet_scheduleDB", "is_available"):
        op.add_column(
            "vet_scheduleDB",
            sa.Column(
                "is_available",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
        )


def downgrade() -> None:
    if _has_column("vet_scheduleDB", "is_available"):
        op.drop_column("vet_scheduleDB", "is_available")
