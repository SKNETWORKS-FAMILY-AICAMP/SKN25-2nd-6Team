from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.models.chat_history import ChatHistory

# 세션 생성
def create_chat_session(db: Session, userid: int, petid: int):
    session = ChatHistory(
        userid=userid,
        petid=petid,
        messages=[],
        keywords=[],
        is_complete=False,
        is_deleted=False
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

# 세션 조회
def get_chat_session(db: Session, session_id: int, userid: int):
    return db.query(ChatHistory).filter(
        ChatHistory.id == session_id,
        ChatHistory.userid == userid,
        ChatHistory.is_deleted == False
    ).first()

# 반려동물별 세션 목록 조회
def get_chat_sessions_by_petid(db: Session, userid: int, petid: int):
    return db.query(ChatHistory).filter(
        ChatHistory.userid == userid,
        ChatHistory.petid == petid,
        ChatHistory.is_deleted == False
    ).order_by(ChatHistory.created_at.desc()).all()

# 메시지 추가
def add_message(db: Session, session: ChatHistory, role: str, content: str, image_url: str = None):
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
    db.commit()
    db.refresh(session)
    return session

# 세션 삭제 
def delete_chat_session(db: Session, session: ChatHistory):
    db.delete(session)
    db.commit()