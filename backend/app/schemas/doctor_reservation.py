from pydantic import BaseModel
from typing import Optional

class ReservationResponse(BaseModel):
    schedule_id: int
    pet_name: str
    owner_name: str
    breed: Optional[str]
    reservation_time: Optional[str]
    status: str
    memo: Optional[str]

class ReservationStatusUpdate(BaseModel):
    status: str