from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, JSON, String
from sqlalchemy.sql import func

from app.db.base import Base


class AgentPipelineResult(Base):
    """Optional agent pipeline snapshot sidecar.

    Business reads should use emrid and scheduleid from canonical tables.
    chat_history_id is retained only as the source chat correlation key.
    """

    __tablename__ = "agent_pipeline_resultDB"

    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_history_id = Column(
        Integer,
        ForeignKey("chat_historyDB.id"),
        nullable=False,
        unique=True,
    )
    userid = Column(Integer, ForeignKey("userDB.userid"), nullable=False, index=True)
    petid = Column(Integer, ForeignKey("petDB.petid"), nullable=False, index=True)
    emrid = Column(Integer, ForeignKey("guardianDB.emrid"), nullable=True, index=True)
    scheduleid = Column(Integer, ForeignKey("scheduleDB.scheduleid"), nullable=True, index=True)
    triage_result = Column(JSON, nullable=True)
    schedule_result = Column(JSON, nullable=True)
    chart_result = Column(JSON, nullable=True)
    validation_result = Column(JSON, nullable=True)
    judge_result = Column(JSON, nullable=True)
    retrieval_status = Column(String, nullable=True)
    rag_confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
