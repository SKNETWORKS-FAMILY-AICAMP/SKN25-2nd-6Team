"""remove ui fields

Revision ID: ff447c303a68
Revises: c1a2d9e7f0ab
Create Date: 2026-05-24 02:22:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'ff447c303a68'
down_revision: Union[str, None] = 'c1a2d9e7f0ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def _existing_columns(table_name: str) -> set[str]:
    connection = op.get_bind()
    rows = connection.execute(
        sa.text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"),
        {"t": table_name},
    ).fetchall()
    return {r[0] for r in rows}


def upgrade() -> None:
    # Restore address to userDB if the old 9f8fbd8c0bf0 had dropped it before the rewrite.
    user_cols = _existing_columns("userDB")
    if "address" not in user_cols:
        op.add_column("userDB", sa.Column("address", sa.String(255), nullable=True))

    # Safely drop doctorEMRDB legacy UI columns if they exist.
    emr_cols = _existing_columns("doctorEMRDB")
    for col in ("vet_note", "vet_memo", "attachments"):
        if col in emr_cols:
            op.drop_column("doctorEMRDB", col)


def downgrade() -> None:
    pass
