from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from app.models.chat_history import ChatHistory

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

    # JSON 컬럼 변경 감지를 위해 flag_modified 사용
    session.messages = messages
    flag_modified(session, "messages")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

# 세션 삭제
async def delete_chat_session(db: AsyncSession, session: ChatHistory):
    await db.delete(session)
    await db.commit()
