from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.doctor_auth import router as doctor_auth_router
from app.api.pets import router as pets_router
from app.api.schedules import router as schedules_router
from app.api.chat import router as chat_router
from app.api.dashboard import router as dashboard_router
from app.api.patient import router as patient_router
from app.api.doctor_reservation import router as doctor_reservation_router
from app.api.followup import router as followup_router
from app.api.emr import router as emr_router
from app.api.alarm import router as alarm_router
from app.core.config import settings
from ai.router import router as agent_router



app = FastAPI(title="MediPaw API")

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": exc.status_code, "message": exc.detail}
    )

_allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(doctor_auth_router)
app.include_router(pets_router)
app.include_router(schedules_router)
app.include_router(chat_router)
app.include_router(dashboard_router)
app.include_router(patient_router)
app.include_router(doctor_reservation_router)
app.include_router(followup_router)
app.include_router(emr_router)
app.include_router(alarm_router)
app.include_router(agent_router)
