from datetime import datetime, timedelta, timezone

# 한국 표준시(UTC+9, DST 없음). tzdata 패키지 의존을 피하려고 고정 오프셋 사용.
KST = timezone(timedelta(hours=9), name="KST")


def to_kst(dt: datetime | None) -> datetime | None:
    """timestamptz 값을 KST로 변환한다.

    asyncpg는 timestamptz 컬럼을 항상 UTC(aware)로 반환하므로,
    표시/직렬화 직전에 KST로 변환해야 올바른 한국 시각이 된다.
    naive 값(legacy)은 이미 KST로 간주한다.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=KST)
    return dt.astimezone(KST)
