from typing import List

from pydantic import BaseModel


# 대시보드 진료 항목
class DashboardScheduleItem(BaseModel):
    id: int
    start: str
    end: str
    patientName: str
    species: str
    breed: str
    age: str
    weight: str
    reason: str
    type: str
    status: str


# 대시보드 요약 통계
class DashboardSummary(BaseModel):
    total: int
    waiting: int
    emergency: int
    completed: int


# 대시보드 응답 본문
class DashboardResult(BaseModel):
    summaries: DashboardSummary
    schedules: List[DashboardScheduleItem]
