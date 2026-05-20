from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.doctor_auth import router as doctor_auth_router
from app.api.pets import router as pets_router
from app.api.schedules import router as schedules_router
from app.api.dashboard import router as dashboard_router
from app.api.patient import router as patient_router



app = FastAPI(title="MediPaw API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.0.2:5173",  # 민서 IP
        "http://192.168.0.32:5173",  # 프론트 팀원 IP 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(doctor_auth_router)
app.include_router(pets_router)
app.include_router(schedules_router)
app.include_router(dashboard_router)
app.include_router(patient_router)