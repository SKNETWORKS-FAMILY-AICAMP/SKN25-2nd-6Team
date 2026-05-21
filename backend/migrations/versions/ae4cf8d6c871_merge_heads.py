"""merge heads

Revision ID: ae4cf8d6c871
Revises: a09cd44462d6, a1b2c3d4e5f6
Create Date: 2026-05-21 11:20:43.265736

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ae4cf8d6c871'
down_revision: Union[str, None] = ('a09cd44462d6', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
