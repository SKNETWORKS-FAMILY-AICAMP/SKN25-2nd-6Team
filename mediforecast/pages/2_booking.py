import time as _time
import streamlit as st
import base64
from pathlib import Path
from datetime import date, datetime, time as dt_time

from utils.constants import NEIGHBOURHOODS
from utils.demo_data import get_patient_profiles, add_appointment, update_patient_profile
from utils.ml_utils import predict_emergency

st.set_page_config(
    page_title="MediForecast | Book Appointment",
    page_icon="🏥",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# logo
logo_b64 = base64.b64encode(
    Path(__file__).parent.parent.joinpath("static", "logo.png").read_bytes()
).decode()

# css
def load_css(path: str) -> None:
    css = Path(path).read_text(encoding="utf-8")
    st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)

load_css(Path(__file__).parent.parent / "static" / "booking_style.css")

# Page header + title card
st.markdown(f"""
<div class="page-header">
    <a class="back-btn" href="/" target="_self">← Back to Home</a>
    <img src="data:image/png;base64,{logo_b64}" style="height: 36px; object-fit: contain;" />
</div>

<div class="form-card">
    <div class="form-title">Book an Appointment</div>
    <div class="form-subtitle">Please fill in your details to schedule a visit.</div>
</div>
""", unsafe_allow_html=True)

# Form
with st.container(border=True):

    # Patient type
    st.markdown('<div class="section-label">Patient Type</div>', unsafe_allow_html=True)
    patient_type = st.radio(
        "patient_type",
        ["New Patient", "Existing Patient"],
        horizontal=True,
        label_visibility="collapsed",
    )
    is_existing = patient_type == "Existing Patient"

    # Existing patient selector
    pid: str | None = None
    prefill: dict = {}

    if is_existing:
        profiles = get_patient_profiles()
        if not profiles:
            st.warning("No existing patients found in the system.")
        else:
            sorted_items = sorted(profiles.items(), key=lambda x: x[1].get("name", ""))
            disp_names   = [f"{info['name']}  (#{p[-6:]})" for p, info in sorted_items]
            pid_list     = [p for p, _ in sorted_items]

            st.markdown('<div class="section-label">Select Patient</div>', unsafe_allow_html=True)
            sel_disp = st.selectbox("Select Patient", disp_names, label_visibility="collapsed")
            pid      = pid_list[disp_names.index(sel_disp)]
            prefill  = profiles[pid]

            st.markdown(
                f'<div style="background:#f0f4ff;border-radius:10px;padding:10px 16px;'
                f'font-size:0.85rem;color:#3a3f50;margin:4px 0 10px;">'
                f'<span style="color:#11b83f;font-size:1.05rem;">&#127973;</span> '
                f'<strong>Patient ID: {pid}</strong> &nbsp;·&nbsp; '
                f'First visit: {prefill.get("first_visit_date", "N/A")}'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Different key suffix resets widget state when switching patients
    key_sfx = pid if pid else "__new__"

    # Personal information
    st.markdown('<div class="section-label">Personal Information</div>', unsafe_allow_html=True)
    col1, col2 = st.columns(2)
    with col1:
        name = st.text_input(
            "Full Name", value=prefill.get("name", ""),
            placeholder="e.g. Jane Smith", key=f"name__{key_sfx}",
        )
    with col2:
        gender = st.radio(
            "Gender", ["Female", "Male"],
            index=1 if prefill.get("gender") == "M" else 0,
            horizontal=True, key=f"gender__{key_sfx}",
        )
    age = st.number_input(
        "Age", min_value=0, max_value=120,
        value=int(prefill.get("age", 30)), step=1, key=f"age__{key_sfx}",
    )

    # Neighbourhood
    st.markdown('<div class="section-label">Neighbourhood</div>', unsafe_allow_html=True)
    NHOOD_OPTIONS = ["Select your neighbourhood..."] + NEIGHBOURHOODS
    nhood_val = prefill.get("neighbourhood", "")
    nhood_idx = NHOOD_OPTIONS.index(nhood_val) if nhood_val in NHOOD_OPTIONS else 0
    neighbourhood = st.selectbox(
        "Neighbourhood", NHOOD_OPTIONS, index=nhood_idx,
        label_visibility="collapsed", key=f"nhood__{key_sfx}",
    )

    # Medical conditions
    st.markdown('<div class="section-label">Medical Conditions</div>', unsafe_allow_html=True)
    col3, col4, col5 = st.columns(3)
    with col3:
        hypertension = st.checkbox("Hypertension", value=bool(prefill.get("has_hypertension", 0)), key=f"hyp__{key_sfx}")
    with col4:
        diabetes     = st.checkbox("Diabetes",     value=bool(prefill.get("has_diabetes",     0)), key=f"dia__{key_sfx}")
    with col5:
        alcoholism   = st.checkbox("Alcoholism",   value=bool(prefill.get("has_alcoholism",   0)), key=f"alc__{key_sfx}")

    handicap = st.selectbox(
        "Handicap Level",
        options=[0, 1, 2, 3, 4],
        index=int(prefill.get("has_handicap", 0)),
        format_func=lambda x: {0: "0 – None", 1: "1 – Mild", 2: "2 – Moderate", 3: "3 – Severe", 4: "4 – Profound"}[x],
        key=f"han__{key_sfx}",
    )

    # Scholarship
    st.markdown('<div class="section-label">Scholarship</div>', unsafe_allow_html=True)
    scholarship = st.checkbox(
        "I am currently receiving a government scholarship (Bolsa Família)",
        value=bool(prefill.get("scholarship", 0)), key=f"sch__{key_sfx}",
    )

    # Appointment date & time
    st.markdown('<div class="section-label">Appointment Date &amp; Time</div>', unsafe_allow_html=True)
    col_d, col_h, col_m = st.columns([2, 1, 1])
    with col_d:
        appt_date = st.date_input(
            "Date", min_value=date.today(), value=date.today(),
            key=f"date__{key_sfx}",
        )
    with col_h:
        hour = st.selectbox(
            "Hour", list(range(8, 18)),
            format_func=lambda x: f"{x:02d}",
            key=f"hour__{key_sfx}",
        )
    with col_m:
        minute = st.selectbox(
            "Minute", [0, 15, 30, 45],
            format_func=lambda x: f"{x:02d}",
            key=f"min__{key_sfx}",
        )

    # Symptoms
    st.markdown('<div class="section-label">Symptoms / Reason for Visit</div>', unsafe_allow_html=True)
    symptoms = st.text_area(
        "Describe your symptoms",
        placeholder="Please describe your symptoms or reason for visit...",
        height=120, label_visibility="collapsed", key=f"symptoms__{key_sfx}",
    )

    st.markdown("<div style='height: 8px'></div>", unsafe_allow_html=True)

    # Submit
    btn_label = "Book an Appointment"
    if st.button(btn_label):
        if not name.strip():
            st.error("Please enter the patient's full name.")
        elif neighbourhood == "Select your neighbourhood...":
            st.error("Please select a neighbourhood.")
        elif not symptoms.strip():
            st.error("Please describe the symptoms or reason for visit.")
        else:
            # Days from now to appointment (non-negative)
            appt_dt   = datetime.combine(appt_date, dt_time(hour, minute))
            lead_time = max(0, (appt_dt - datetime.now()).days)
            appt_time = f"{hour:02d}:{minute:02d}"
            gender_code = "M" if gender == "Male" else "F"

            # Predict emergency flag (BERT model if available, else keyword fallback)
            with st.spinner("Analyzing symptoms…"):
                emergency_val = predict_emergency(symptoms.strip(), int(age), gender_code)

            profile_fields = {
                "name":             name.strip(),
                "gender":           gender_code,
                "age":              int(age),
                "neighbourhood":    neighbourhood,
                "has_hypertension": int(hypertension),
                "has_diabetes":     int(diabetes),
                "has_alcoholism":   int(alcoholism),
                "has_handicap":     handicap,  # 0-4
                "scholarship":      int(scholarship),
                "last_visit_date":  appt_date.isoformat(),
            }

            if is_existing and pid:
                # Update profile fields across all existing records
                update_patient_profile(pid, profile_fields)
                # Append new appointment linked to this patient
                new_appt = {
                    "patient_id":       pid,
                    **profile_fields,
                    "time":             appt_time,
                    "appt_date":        appt_date.isoformat(),
                    "sms_received":     0,
                    "lead_time_days":   lead_time,
                    "first_visit_date": prefill.get("first_visit_date", appt_date.isoformat()),
                    "emergency":        emergency_val,
                    "symptoms":         symptoms.strip(),
                }
                add_appointment(new_appt)
                st.session_state["_booking_success"] = (
                    f"✅ Profile updated & appointment booked for **{name.strip()}** "
                    f"on **{appt_date.strftime('%B %d, %Y')} at {appt_time}**."
                )
                st.rerun()
            else:
                # New patient — auto-generate ID from timestamp
                new_pid  = str(int(_time.time() * 1000))[:14]
                new_appt = {
                    "patient_id":       new_pid,
                    **profile_fields,
                    "time":             appt_time,
                    "appt_date":        appt_date.isoformat(),
                    "sms_received":     0,
                    "lead_time_days":   lead_time,
                    "first_visit_date": appt_date.isoformat(),
                    "last_visit_date":  appt_date.isoformat(),
                    "emergency":        emergency_val,
                    "symptoms":         symptoms.strip(),
                }
                add_appointment(new_appt)
                emg_notice = " 🚨 **Emergency flag detected.**" if emergency_val else ""
                st.session_state["_booking_success"] = (
                    f"✅ New patient **{name.strip()}** registered! "
                    f"Appointment on **{appt_date.strftime('%B %d, %Y')} at {appt_time}**.{emg_notice}"
                )
                if appt_date == date.today():
                    st.session_state["_booking_info"] = "🏥 This appointment will appear on today's dashboard."
                st.rerun()

# Success / info messages below the form (persist across rerun via session_state)
if "_booking_success" in st.session_state:
    st.success(st.session_state.pop("_booking_success"))
if "_booking_info" in st.session_state:
    st.info(st.session_state.pop("_booking_info"))
