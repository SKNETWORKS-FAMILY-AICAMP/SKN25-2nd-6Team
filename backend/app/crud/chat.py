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


# AI 트리아지용 Guardian(emrid) 신규 생성
# category code=2(AI트리아지) 우선, 없으면 code=1(정기검진) fallback
async def create_triage_guardian(db: AsyncSession, petid: int) -> Guardian:
    category_result = await db.execute(
        select(CategoryMaster).where(CategoryMaster.code == 2)
    )
    category = category_result.scalar_one_or_none()
    if not category:
        category_result = await db.execute(
            select(CategoryMaster).where(CategoryMaster.code == 1)
        )
        category = category_result.scalar_one_or_none()

    guardian = Guardian(
        petid=petid,
        category_id=category.id,
    )
    db.add(guardian)
    await db.flush()
    await db.commit()
    await db.refresh(guardian)
    return guardian


# ChatHistory.emrid 설정 (NULL → emrid, 기존 값 있으면 스킵)
async def update_session_emrid(db: AsyncSession, session: ChatHistory, emrid: int) -> ChatHistory:
    if session.emrid is not None:
        return session
    session.emrid = emrid
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session
