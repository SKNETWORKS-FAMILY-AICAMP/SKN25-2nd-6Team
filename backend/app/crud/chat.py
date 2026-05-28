from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from app.models.chat_history import ChatHistory
from app.models.guardian import Guardian
from app.models.master import CategoryMaster

# 세션 생성
async def create_chat_session(db: AsyncSession, userid: int, petid: int):
    session = ChatHistory(
        userid=userid,
        petid=petid,
        messages=[],
        keywords=[],
        is_complete=False,
        is_deleted=False
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

# 세션 조회
async def get_chat_session(db: AsyncSession, session_id: int, userid: int):
    result = await db.execute(
        select(ChatHistory).where(
            ChatHistory.id == session_id,
            ChatHistory.userid == userid,
            ChatHistory.is_deleted == False
        )
    )
    return result.scalar_one_or_none()

# 반려동물별 세션 목록 조회
async def get_chat_sessions_by_petid(db: AsyncSession, userid: int, petid: int):
    result = await db.execute(
        select(ChatHistory)
        .where(
            ChatHistory.userid == userid,
            ChatHistory.petid == petid,
            ChatHistory.is_deleted == False
        )
        .order_by(ChatHistory.created_at.desc())
    )
    return result.scalars().all()

# 메시지 추가
async def add_message(db: AsyncSession, session: ChatHistory, role: str, content: str, image_url: str = None):
    messages = list(session.messages or [])
    message = {
        "role": role,
        "content": content,
        "image_url": image_url,
    }
    messages.append(message)

    session.messages = messages
    flag_modified(session, "messages")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

# 세션 키워드/완료 업데이트
async def update_session_complete(db: AsyncSession, session: ChatHistory, keywords: list):
    session.keywords = keywords
    session.is_complete = True
    flag_modified(session, "keywords")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

# 세션 삭제
async def delete_chat_session(db: AsyncSession, session: ChatHistory):
    await db.delete(session)
    await db.commit()


# 증상 키워드 → category code 매핑
_SYMPTOM_CATEGORY_MAP: list[tuple[list[str], int]] = [
    (["구토", "설사", "식욕", "소화", "복통", "구역", "배변"], 1),   # 소화기
    (["기침", "호흡", "재채기", "코막", "폐", "기관"], 2),            # 호흡기
    (["피부", "발진", "긁", "털", "탈모", "상처", "외상"], 3),        # 피부/외상
    (["눈", "눈물", "귀", "안구", "결막", "귀지"], 4),               # 눈/귀
    (["발작", "경련", "신경", "마비", "의식"], 5),                    # 신경계
    (["절뚝", "다리", "관절", "근육", "골절", "보행"], 6),            # 근골격계
    (["소변", "배뇨", "비뇨", "방광", "혈뇨"], 7),                   # 비뇨기
    (["발열", "무기력", "기력", "체중", "전신", "식이"], 8),          # 전신
    (["예방접종", "검진", "정기"], 9),                               # 예방접종/정기검진
]


def _infer_category_code(keywords: list[str], chief_complaint: str = "") -> int:
    """symptom_keywords + chief_complaint 로 가장 적합한 category code를 반환."""
    text = " ".join(keywords) + " " + (chief_complaint or "")
    for kw_list, code in _SYMPTOM_CATEGORY_MAP:
        if any(kw in text for kw in kw_list):
            return code
    return 10  # 기타


# AI 트리아지용 Guardian(emrid) 신규 생성 — 초기에는 '기타(10)' 임시 배정
async def create_triage_guardian(db: AsyncSession, petid: int) -> Guardian:
    category_result = await db.execute(
        select(CategoryMaster).where(CategoryMaster.code == 10)
    )
    category = category_result.scalar_one_or_none()
    if not category:
        # 기타 없으면 첫 번째 카테고리 fallback
        category_result = await db.execute(select(CategoryMaster))
        category = category_result.scalars().first()

    guardian = Guardian(
        petid=petid,
        category_id=category.id if category else None,
    )
    db.add(guardian)
    await db.flush()
    await db.commit()
    await db.refresh(guardian)
    return guardian


async def update_guardian_category(
    db: AsyncSession,
    emrid: int,
    symptom_keywords: list[str],
    chief_complaint: str = "",
) -> None:
    """Triage 완료 후 실제 증상 기반으로 category_id를 업데이트한다."""
    result = await db.execute(select(Guardian).where(Guardian.emrid == emrid))
    guardian = result.scalar_one_or_none()
    if not guardian:
        return

    code = _infer_category_code(symptom_keywords, chief_complaint)
    cat_result = await db.execute(
        select(CategoryMaster).where(CategoryMaster.code == code)
    )
    category = cat_result.scalar_one_or_none()
    if category:
        guardian.category_id = category.id
        await db.commit()


# ChatHistory.emrid 설정 (NULL → emrid, 기존 값 있으면 스킵)
async def update_session_emrid(db: AsyncSession, session: ChatHistory, emrid: int) -> ChatHistory:
    if session.emrid is not None:
        return session
    session.emrid = emrid
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session
