from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


def _to_async_url(url: str) -> str:
    """동기 PostgreSQL URL을 asyncpg 드라이버용 URL로 변환한다.

    alembic 마이그레이션은 settings.DATABASE_URL(psycopg2)을 그대로 쓰고,
    런타임 앱만 비동기 드라이버를 사용하도록 여기서만 변환한다.
    """
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql+psycopg2://"):
        return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


engine = create_async_engine(
    _to_async_url(settings.DATABASE_URL),
    pool_pre_ping=True,
    # asyncpg prepared statement 캐시를 비활성화.
    # 마이그레이션 후 컬럼이 추가/삭제되어도 'cached plan must not change result type' 오류를 방지.
    # 성능 영향: 소규모(하루 100건↓) 트래픽에서는 무시 가능.
    connect_args={"statement_cache_size": 0},
)

# expire_on_commit=False: 커밋 후에도 ORM 속성 접근 시 재조회(await 필요)가
# 발생하지 않도록 하여 비동기 환경에서 안전하게 객체를 반환할 수 있게 한다.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


async def get_db():
    async with AsyncSessionLocal() as db:
        yield db
