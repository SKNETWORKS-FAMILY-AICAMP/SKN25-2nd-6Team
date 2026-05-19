"""merge heads

Revision ID: e454293dd4bb
Revises: 9265c9ae7a1f, d17ddfd496dc
Create Date: 2026-05-19 15:15:03.164176

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e454293dd4bb'
down_revision: Union[str, None] = ('9265c9ae7a1f', 'd17ddfd496dc')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
