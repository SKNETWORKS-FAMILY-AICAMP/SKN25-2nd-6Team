import json
import pandas as pd
from pathlib import Path
from datetime import date

# JSON persistence for demo appointments
_JSON_PATH = Path(__file__).resolve().parents[2] / "data" / "demo_appointments.json"


def _load_all() -> list[dict]:
    if _JSON_PATH.exists():
        try:
            with _JSON_PATH.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    _save_all(TODAY_APPOINTMENTS)
    return [dict(a) for a in TODAY_APPOINTMENTS]

def _save_all(appointments: list[dict]) -> None:
    _JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _JSON_PATH.open("w", encoding="utf-8") as f:
        json.dump(appointments, f, ensure_ascii=False, indent=2)

TODAY_APPOINTMENTS = [
    {"patient_id": "16349457375728", "name": "Nayeon Kim", "gender": "F", "age": 28, "time": "09:00", "sms_received": 1, "lead_time_days": 7, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "CENTRO", "first_visit_date": "2016-05-02", "last_visit_date": "2016-06-07"},
    {"patient_id": "2168349418751", "name": "Yeseung Yang", "gender": "F", "age": 35, "time": "09:20", "sms_received": 0, "lead_time_days": 2, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "ANDORINHAS", "first_visit_date": "2016-06-07", "last_visit_date": "2016-06-07"},
    {"patient_id": "1168774745422", "name": "Beomsu Park", "gender": "M", "age": 42, "time": "09:30", "sms_received": 1, "lead_time_days": 5, "has_hypertension": 1, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "SANTA MARTHA", "first_visit_date": "2016-06-07", "last_visit_date": "2016-06-07"},
    {"patient_id": "34299581483367", "name": "Geunhyeok Lee", "gender": "M", "age": 55, "time": "09:40", "sms_received": 0, "lead_time_days": 1, "has_hypertension": 0, "has_diabetes": 1, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "BONFIM", "first_visit_date": "2016-05-03", "last_visit_date": "2016-06-08"},
    {"patient_id": "18823843757122", "name": "Hyeonwoo Choi", "gender": "M", "age": 31, "time": "09:45", "sms_received": 1, "lead_time_days": 3, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "TABUAZEIRO", "first_visit_date": "2016-05-31", "last_visit_date": "2016-06-06"},
    {"patient_id": "93544699263711", "name": "Gayeong Kwon", "gender": "F", "age": 24, "time": "10:00", "sms_received": 0, "lead_time_days": 14, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "SANTO ANTÔNIO", "first_visit_date": "2016-05-16", "last_visit_date": "2016-06-06"},
    {"patient_id": "1166652312747", "name": "Haejun Yeo", "gender": "M", "age": 67, "time": "10:10", "sms_received": 1, "lead_time_days": 4, "has_hypertension": 1, "has_diabetes": 1, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "emergency": 1, "neighbourhood": "GURIGICA", "first_visit_date": "2016-06-03", "last_visit_date": "2016-06-03"},
    {"patient_id": "5164842912135", "name": "Haengun Yu", "gender": "M", "age": 19, "time": "10:20", "sms_received": 0, "lead_time_days": 0, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "CENTRO", "first_visit_date": "2016-06-07", "last_visit_date": "2016-06-07"},
    {"patient_id": "76436476713814", "name": "Unyeol Jeon", "gender": "M", "age": 45, "time": "10:30", "sms_received": 1, "lead_time_days": 10, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "DA PENHA", "first_visit_date": "2016-06-03", "last_visit_date": "2016-06-03"},
    {"patient_id": "843774968473447", "name": "Eunseok Jo", "gender": "M", "age": 52, "time": "11:00", "sms_received": 1, "lead_time_days": 6, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "JARDIM CAMBURI", "first_visit_date": "2016-06-03", "last_visit_date": "2016-06-03"},
    {"patient_id": "22739496469342", "name": "Seohyeon Kim", "gender": "F", "age": 29, "time": "11:00", "sms_received": 0, "lead_time_days": 8, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "JARDIM CAMBURI", "first_visit_date": "2016-05-19", "last_visit_date": "2016-06-07"},
    {"patient_id": "198279686554265", "name": "Juhee Kim", "gender": "F", "age": 33, "time": "11:00", "sms_received": 1, "lead_time_days": 2, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "SÃO CRISTÓVÃO", "first_visit_date": "2016-06-06", "last_visit_date": "2016-06-06"},
    {"patient_id": "98729257569184", "name": "Chanyeong Kim", "gender": "M", "age": 38, "time": "11:10", "sms_received": 0, "lead_time_days": 15, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "TABUAZEIRO", "first_visit_date": "2016-06-06", "last_visit_date": "2016-06-06"},
    {"patient_id": "955324437896599", "name": "Sangmin Lee", "gender": "M", "age": 48, "time": "11:20", "sms_received": 1, "lead_time_days": 5, "has_hypertension": 1, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "MARUÍPE", "first_visit_date": "2016-05-31", "last_visit_date": "2016-06-03"},
    {"patient_id": "73473538658", "name": "Wonjun Choi", "gender": "M", "age": 26, "time": "11:30", "sms_received": 0, "lead_time_days": 1, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "NOVA PALESTINA", "first_visit_date": "2016-06-06", "last_visit_date": "2016-06-06"},
    {"patient_id": "78225316373962", "name": "Seongjin Park", "gender": "M", "age": 41, "time": "11:40", "sms_received": 1, "lead_time_days": 7, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "CARATOÍRA", "first_visit_date": "2016-05-31", "last_visit_date": "2016-06-03"},
    {"patient_id": "97943652197", "name": "Munsu Shin", "gender": "M", "age": 59, "time": "11:50", "sms_received": 0, "lead_time_days": 3, "has_hypertension": 0, "has_diabetes": 1, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "ILHA DO PRÍNCIPE", "first_visit_date": "2016-05-10", "last_visit_date": "2016-06-08"},
    {"patient_id": "722385516987736", "name": "Suyeong Lee", "gender": "F", "age": 22, "time": "12:00", "sms_received": 1, "lead_time_days": 4, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "JARDIM DA PENHA", "first_visit_date": "2016-06-08", "last_visit_date": "2016-06-08"},
    {"patient_id": "6346563561873", "name": "Hayun Lee", "gender": "F", "age": 36, "time": "13:00", "sms_received": 0, "lead_time_days": 12, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "SANTA TEREZA", "first_visit_date": "2016-05-03", "last_visit_date": "2016-06-07"},
    {"patient_id": "857945381299535", "name": "Junmyeong Choi", "gender": "M", "age": 50, "time": "13:15", "sms_received": 1, "lead_time_days": 6, "has_hypertension": 1, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "JARDIM DA PENHA", "first_visit_date": "2016-06-03", "last_visit_date": "2016-06-03"},
    {"patient_id": "94582556624467", "name": "Hongik Kim", "gender": "M", "age": 44, "time": "13:20", "sms_received": 0, "lead_time_days": 9, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "GURIGICA", "first_visit_date": "2016-05-02", "last_visit_date": "2016-06-03"},
    {"patient_id": "73663142844159", "name": "Chaerim Lee", "gender": "F", "age": 27, "time": "13:30", "sms_received": 1, "lead_time_days": 2, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "ITARARÉ", "first_visit_date": "2016-05-05", "last_visit_date": "2016-06-07"},
    {"patient_id": "978793849838649", "name": "Hansol Lee", "gender": "F", "age": 31, "time": "13:40", "sms_received": 0, "lead_time_days": 0, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "SANTOS DUMONT", "first_visit_date": "2016-06-01", "last_visit_date": "2016-06-08"},
    {"patient_id": "8319825746742", "name": "Hayeong Im", "gender": "F", "age": 25, "time": "14:15", "sms_received": 1, "lead_time_days": 5, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "JESUS DE NAZARETH", "first_visit_date": "2016-05-16", "last_visit_date": "2016-06-06"},
    {"patient_id": "54137448737647", "name": "Yurim Choi", "gender": "F", "age": 39, "time": "14:30", "sms_received": 0, "lead_time_days": 11, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "REDENÇÃO", "first_visit_date": "2016-05-02", "last_visit_date": "2016-06-08"},
    {"patient_id": "989133166643", "name": "Jihyun Kim", "gender": "F", "age": 34, "time": "14:40", "sms_received": 1, "lead_time_days": 3, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "SÃO JOSÉ", "first_visit_date": "2016-06-08", "last_visit_date": "2016-06-08"},
    {"patient_id": "11619495835628", "name": "Yeonjun Kim", "gender": "M", "age": 21, "time": "15:00", "sms_received": 0, "lead_time_days": 1, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "ILHA DE SANTA MARIA", "first_visit_date": "2016-06-07", "last_visit_date": "2016-06-07"},
    {"patient_id": "24662666413967", "name": "Minseo Cho", "gender": "F", "age": 30, "time": "15:10", "sms_received": 1, "lead_time_days": 8, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "CONSOLAÇÃO", "first_visit_date": "2016-06-06", "last_visit_date": "2016-06-06"},
    {"patient_id": "245549134617978", "name": "Jihyun Park", "gender": "F", "age": 46, "time": "15:50", "sms_received": 0, "lead_time_days": 4, "has_hypertension": 0, "has_diabetes": 0, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "neighbourhood": "SANTOS REIS", "first_visit_date": "2016-05-24", "last_visit_date": "2016-06-03"},
    {"patient_id": "7619841287682", "name": "Yeonjeong Park", "gender": "F", "age": 53, "time": "16:00", "sms_received": 1, "lead_time_days": 10, "has_hypertension": 1, "has_diabetes": 1, "has_alcoholism": 0, "has_handicap": 0, "scholarship": 0, "emergency": 1, "neighbourhood": "CARATOÍRA", "first_visit_date": "2016-05-09", "last_visit_date": "2016-06-08"},
]

def get_todays_appointments() -> pd.DataFrame:
    """Today's appointments (demo entries + new bookings for today), sorted by time"""
    all_appts = _load_all()
    today_str = date.today().isoformat()
    today_appts = [
        a for a in all_appts
        if not a.get("appt_date") or a.get("appt_date") == today_str
    ]
    if not today_appts:
        today_appts = all_appts
    df = pd.DataFrame(today_appts)
    if "emergency" not in df.columns:
        df["emergency"] = 0
    else:
        df["emergency"] = df["emergency"].fillna(0).astype(int)
    if "time" in df.columns:
        df = df.sort_values("time").reset_index(drop=True)
    return df

def get_patient_profiles() -> dict[str, dict]:
    """Return {patient_id: latest appointment info} for each unique patient"""
    profiles: dict[str, dict] = {}
    for appt in _load_all():
        pid = str(appt.get("patient_id", "")).strip()
        if pid:
            profiles[pid] = appt  # most recent entry for pid
    return profiles

def add_appointment(appt_dict: dict) -> None:
    """Append a new appointment entry and persist to JSON"""
    all_appts = _load_all()
    all_appts.append(appt_dict)
    _save_all(all_appts)


def update_patient_profile(patient_id: str, updated_fields: dict) -> None:
    """Update profile fields for all existing appointments of this patient"""
    all_appts = _load_all()
    for appt in all_appts:
        if str(appt.get("patient_id", "")).strip() == str(patient_id).strip():
            for k, v in updated_fields.items():
                if k != "patient_id":
                    appt[k] = v
    _save_all(all_appts)