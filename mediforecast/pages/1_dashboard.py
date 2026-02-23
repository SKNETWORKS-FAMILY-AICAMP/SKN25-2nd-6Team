import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from datetime import datetime
from pathlib import Path
import base64
import joblib
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.weather_api import fetch_weather
from utils.demo_data import get_todays_appointments

# === HELPER FUNCTIONS ===
@st.cache_resource
def load_model():
    """Load CatBoost model"""
    model_path = Path(__file__).parent.parent.parent / "results" / "final_model" / "catboost_model.joblib"
    return joblib.load(model_path)

def prepare_features(patient_row, model_features, weather_detail=None):
    """Prepare feature vector for a single patient"""
    if weather_detail is None:
        weather_detail = {"max_temp": 28.0, "min_temp": 22.0, "precip_mm": 0.0,
                          "weather": 0, "temp_range": 6.0, "is_rainy": 0}
    # Feature order must match Train_table_full.csv column order (after DROP_COLS removal)
    # Order: sms_received, lead_time_days, gender, age, has_hypertension, has_diabetes, 
    #        has_alcoholism, has_handicap, scholarship, dow, month, is_weekend, is_holiday,
    #        is_before_holiday, is_after_holiday, max_temp, min_temp, precip_mm, weather,
    #        temp_range, is_rainy, nhood_noshow_rate, patient_appt_count, patient_noshow_count,
    #        patient_noshow_rate, is_first_visit, same_day_appts
    
    features = {}
    
    # Base features (in Train_table_full.csv order)
    features["sms_received"] = int(patient_row.get("sms_received", 0))
    features["lead_time_days"] = int(patient_row.get("lead_time_days", 0))
    features["gender"] = 1 if patient_row.get("gender") == "M" else 0
    features["age"] = int(patient_row.get("age", 30))
    features["has_hypertension"] = int(patient_row.get("has_hypertension", 0))
    features["has_diabetes"] = int(patient_row.get("has_diabetes", 0))
    features["has_alcoholism"] = int(patient_row.get("has_alcoholism", 0))
    features["has_handicap"] = int(patient_row.get("has_handicap", 0))
    features["scholarship"] = int(patient_row.get("scholarship", 0))
    
    # Date/time features (use current date)
    now = datetime.now()
    features["dow"] = now.weekday()  # 0=Monday, 6=Sunday
    features["month"] = now.month
    features["is_weekend"] = 1 if now.weekday() >= 5 else 0  # 5=Saturday, 6=Sunday
    features["is_holiday"] = 0  # TODO: integrate holiday calendar if needed
    features["is_before_holiday"] = 0
    features["is_after_holiday"] = 0
    
    # Weather features — Open-Meteo 실시간 데이터 (훈련 데이터와 동일한 WMO 코드 체계)
    features["max_temp"]  = weather_detail["max_temp"]
    features["min_temp"]  = weather_detail["min_temp"]
    features["precip_mm"] = weather_detail["precip_mm"]
    features["weather"]   = weather_detail["weather"]
    features["temp_range"]= weather_detail["temp_range"]
    features["is_rainy"]  = weather_detail["is_rainy"]
    
    # Post-split features (estimated)
    features["nhood_noshow_rate"] = 0.2  # global average
    features["patient_appt_count"] = 0
    features["patient_noshow_count"] = 0
    features["patient_noshow_rate"] = 0.2
    features["is_first_visit"] = 1
    features["same_day_appts"] = 1
    
    # Return as DataFrame matching model feature order
    return pd.DataFrame([features])[model_features]

# color set
COLOR_BLUE      = "#85AAD0"   # Today, Weather
COLOR_BLUE_DARK = "#6990B8"   # blue gradation
COLOR_PINK      = "#F57E76"   # No-Show Rate card / Risk High
COLOR_PINK_DARK = "#D9605A"   # pink gradation
COLOR_RISK_HIGH = "#F57E76"   # Risk ≥ 65%
COLOR_RISK_MED  = "#FFC782"   # Risk ≥ 45%
COLOR_RISK_LOW  = "#8AC19A"   # Risk < 45%
COLOR_SELECTED  = "#85AAD0"

st.set_page_config(
    page_title="NoShow Predictor",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# CSS
st.markdown(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono&display=swap');

html, body, [class*="css"] {{
    font-family: 'DM Sans', sans-serif;
}}

/* Streamlit 기본 UI 숨기기 */
#MainMenu, header, footer {{ visibility: hidden; }}
[data-testid="stHeader"] {{ display: none; }}
[data-testid="stSidebar"] {{ display: none; }}
[data-testid="stSidebarNav"] {{ display: none; }}
section[data-testid="stSidebar"] {{ display: none; }}

.main {{ background-color: #f4f6f9; }}

.top-card {{
    border-radius: 16px;
    padding: 18px 22px;
    display: flex;
    align-items: center;
    gap: 14px;
    color: white;
    font-weight: 600;
}}
.top-card .icon {{ font-size: 2rem; }}
.top-card .label {{ font-size: 0.75rem; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em; }}
.top-card .value {{ font-size: 1.35rem; font-weight: 700; }}

.card-project {{ background: white; color: #1a1a2e; border: 2px solid #e0e4ef; border-radius: 16px; padding: 18px 22px; display:flex; align-items:center; justify-content:center; }}
.card-project .proj-name {{ font-size: 1.1rem; font-weight: 700; color: #1a1a2e; text-align:center; }}
.card-date   {{ background: linear-gradient(135deg, {COLOR_BLUE}, {COLOR_BLUE_DARK}); }}
.card-weather{{ background: linear-gradient(135deg, {COLOR_BLUE}, {COLOR_BLUE_DARK}); }}
.card-noshow {{ background: linear-gradient(135deg, {COLOR_PINK}, {COLOR_PINK_DARK}); }}

div[data-testid="stVerticalBlockBorderWrapper"]:has(> div > div > div[data-testid="stVerticalBlock"]) {{
    background: white;
    border-radius: 20px;
    padding: 24px;
    border: none;
}}

.patient-card {{
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 14px;
    border-radius: 12px;
    margin-bottom: 10px;
    border: 1.5px solid #f0f2f7;
    cursor: pointer;
    transition: background 0.15s;
}}
.patient-card:hover {{ background: #f0f4ff; border-color: {COLOR_SELECTED}; }}
.patient-card.selected {{ background: #eef4fb; border-color: {COLOR_SELECTED}; border-width: 2px; }}
.avatar {{
    width: 40px; height: 40px;
    border-radius: 50%;
    background: #dde4f5;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem;
    flex-shrink: 0;
}}
.patient-info {{ flex: 1; }}
.patient-name {{ font-weight: 600; font-size: 0.92rem; color: #1a1a2e; }}
.patient-time {{ font-size: 0.78rem; color: #8a93a8; margin-top: 2px; }}

.risk-badge {{
    padding: 6px 14px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 0.85rem;
    color: white;
    white-space: nowrap;
}}
.risk-high   {{ background: {COLOR_RISK_HIGH}; }}
.risk-medium {{ background: {COLOR_RISK_MED}; color: #6b5a2e; }}
.risk-low    {{ background: {COLOR_RISK_LOW}; }}

.patient-list-scroll {{
    height: 520px;
    max-height: 520px;
    overflow-y: auto;
    padding-right: 4px;
}}

/* Fixed height for sections */
.appointments-section {{
    height: 620px;
    display: flex;
    flex-direction: column;
}}

.risk-analysis-section {{
    height: 620px;
    display: flex;
    flex-direction: column;
}}

/* Patient Profile */
.profile-box {{
    background: #f8f9fc;
    border-radius: 14px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
}}
.big-avatar {{
    width: 64px; height: 64px;
    border-radius: 50%;
    background: #dde4f5;
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem;
    flex-shrink: 0;
}}
.profile-info p {{ margin: 2px 0; font-size: 0.88rem; color: #444; }}
.profile-info strong {{ font-size: 1rem; color: #1a1a2e; }}

.section-title {{ font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; }}

[data-testid="stImage"] {{
    display: flex;
    justify-content: center;
    align-items: center;
}}
</style>
""", unsafe_allow_html=True)

# === LOAD DATA & MODEL ===
try:
    model = load_model()
    patients_df = get_todays_appointments()
    weather_icon, weather_text, weather_detail = fetch_weather()
    
    # Get model feature names (in the order they appear in Train_table_full.csv)
    model_features = [
        "sms_received", "lead_time_days", "gender", "age", "has_hypertension",
        "has_diabetes", "has_alcoholism", "has_handicap", "scholarship",
        "dow", "month", "is_weekend", "is_holiday", "is_before_holiday", "is_after_holiday",
        "max_temp", "min_temp", "precip_mm", "weather", "temp_range", "is_rainy",
        "nhood_noshow_rate", "patient_appt_count", "patient_noshow_count",
        "patient_noshow_rate", "is_first_visit", "same_day_appts"
    ]
    
    # Predict risk for each patient
    appointments = []
    for idx, row in patients_df.iterrows():
        X_pred = prepare_features(row.to_dict(), model_features, weather_detail)
        prob = model.predict_proba(X_pred)[0, 1]
        risk = int(prob * 100)
        
        appointments.append({
            "name": row["name"],
            "gender": row["gender"],
            "time": row["time"],
            "risk": risk,
            "age": int(row.get("age", 30)),
            "lead_time": int(row.get("lead_time_days", 0)),
            "sms_received": int(row.get("sms_received", 0)),
        })
    
except Exception as e:
    st.error(f"Error loading data: {e}")
    import traceback
    st.error(traceback.format_exc())
    # Fallback to dummy data
    appointments = [
        {"name": "Nayeon Kim", "gender": "F", "time": "09:00", "risk": 75, "age": 30, "lead_time": 5, "sms_received": 1},
        {"name": "Beomsu Park", "gender": "M", "time": "09:30", "risk": 37, "age": 25, "lead_time": 3, "sms_received": 0},
    ]
    weather_icon, weather_text = "☀️", "Sunny, 25 °C"
    weather_detail = {"max_temp": 25.0, "min_temp": 20.0, "precip_mm": 0.0,
                      "weather": 0, "temp_range": 5.0, "is_rainy": 0}

def risk_class(r):
    if r >= 65: return "risk-high"
    if r >= 45: return "risk-medium"
    return "risk-low"

if "selected" not in st.session_state:
    st.session_state.selected = 0

# query param으로 선택 처리
if "sel" in st.query_params:
    try:
        st.session_state.selected = int(st.query_params["sel"])
    except (ValueError, IndexError):
        pass

# top cards
c1, c2, c3, c4 = st.columns([0.8, 1, 1, 1])

logo_b64 = base64.b64encode(
    Path(__file__).parent.parent.joinpath("static", "logo.png").read_bytes()
).decode()

with c1:
    with st.container():
        st.markdown(f'<img src="data:image/png;base64,{logo_b64}" width="220">', unsafe_allow_html=True)

with c2:
    today = datetime.now().strftime("%Y - %m - %d")
    st.markdown(f"""
    <div class="top-card card-date">
        <div class="icon">📅</div>
        <div>
            <div class="label">Today</div>
            <div class="value">{today}</div>
        </div>
    </div>""", unsafe_allow_html=True)

with c3:
    st.markdown(f"""
    <div class="top-card card-weather">
        <div class="icon">{weather_icon}</div>
        <div>
            <div class="label">Weather (Vitória)</div>
            <div class="value">{weather_text}</div>
        </div>
    </div>""", unsafe_allow_html=True)

with c4:
    avg_risk = int(np.mean([a["risk"] for a in appointments]))
    st.markdown(f"""
    <div class="top-card card-noshow">
        <div class="icon">⚠️</div>
        <div>
            <div class="label">NO-SHOW RATE</div>
            <div class="value">{avg_risk}%</div>
        </div>
    </div>""", unsafe_allow_html=True)

st.markdown('<div style="height: 24px"></div>', unsafe_allow_html=True)

# main panel
left, right = st.columns([1, 1.8], gap="small")

# left - appointment list
with left:
    with st.container(border=True):
        st.markdown('<div class="section-title">Appointments</div>', unsafe_allow_html=True)

        search = st.text_input("", placeholder="🔍  Search patient...", label_visibility="collapsed")

        filtered = [a for a in appointments if search.lower() in a["name"].lower()] if search else appointments

        # card HTML. st.html은 iframe이므로 CSS를 포함
        card_css = f"""
        <style>
            @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
            * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: 'DM Sans', sans-serif; }}
            body {{ background: transparent; }}
            .patient-list-scroll {{ max-height: 480px; overflow-y: auto; padding-right: 4px; }}
            .patient-card {{
                display: flex; align-items: center; gap: 14px;
                padding: 12px 14px; border-radius: 12px; margin-bottom: 10px;
                border: 1.5px solid #f0f2f7; cursor: pointer; transition: all 0.15s;
            }}
            .patient-card:hover {{ background: #f0f4ff; border-color: {COLOR_SELECTED}; }}
            .patient-card.selected {{ background: #eef4fb; border-color: {COLOR_SELECTED}; border-width: 2px; }}
            .avatar {{
                width: 40px; height: 40px; border-radius: 50%; background: #dde4f5;
                display: flex; align-items: center; justify-content: center;
                font-size: 1.2rem; flex-shrink: 0;
            }}
            .patient-info {{ flex: 1; }}
            .patient-name {{ font-weight: 600; font-size: 0.92rem; color: #1a1a2e; }}
            .patient-time {{ font-size: 0.78rem; color: #8a93a8; margin-top: 2px; }}
            .risk-badge {{
                padding: 6px 14px; border-radius: 20px; font-weight: 700;
                font-size: 0.85rem; color: white; white-space: nowrap;
            }}
            .risk-high   {{ background: {COLOR_RISK_HIGH}; }}
            .risk-medium {{ background: {COLOR_RISK_MED}; color: #6b5a2e; }}
            .risk-low    {{ background: {COLOR_RISK_LOW}; }}
            a {{ text-decoration: none; color: inherit; display: block; }}
        </style>
        """

        cards_inner = ""
        for appt in filtered:
            original_idx = appointments.index(appt) if appt in appointments else 0
            rc = risk_class(appt["risk"])
            icon = "👩" if appt["gender"] == "F" else "👨"
            is_selected = (original_idx == st.session_state.selected)
            sel_cls = " selected" if is_selected else ""

            cards_inner += f"""
            <a href="?sel={original_idx}" target="_parent">
                <div class="patient-card{sel_cls}">
                    <div class="avatar">{icon}</div>
                    <div class="patient-info">
                        <div class="patient-name">{appt['name']} / {appt['gender']}</div>
                        <div class="patient-time">{appt['time']}</div>
                    </div>
                    <div class="risk-badge {rc}">Risk : {appt['risk']}%</div>
                </div>
            </a>
            """

        n_cards = len(filtered)
        card_height = min(n_cards * 78 + 16, 500)
        st.html(f"{card_css}<div class='patient-list-scroll'>{cards_inner}</div>")

# right - patient's noshow risk
with right:
    with st.container(border=True):
        st.markdown('<div class="section-title">Patient Risk Analysis</div>', unsafe_allow_html=True)

        sel = appointments[st.session_state.selected]

        # profile
        gender_icon = "👩" if sel["gender"] == "F" else "👨"
        gender_text = "Female" if sel["gender"] == "F" else "Male"
        st.markdown(f"""
        <div class="profile-box">
            <div class="big-avatar">{gender_icon}</div>
            <div class="profile-info">
                <strong>{sel['name']}</strong>
                <p>Gender : {gender_text}</p>
                <p>Appointment : {sel['time']}</p>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # SHAP-like feature contribution plot
        sel_dict = sel
        
        # Calculate feature contributions (simplified)
        contributions = []
        if sel_dict.get("lead_time", 0) > 7:
            contributions.append(("Lead Time (days)", 15))
        else:
            contributions.append(("Lead Time (days)", -5))
            
        if sel_dict.get("sms_received", 0) == 0:
            contributions.append(("No SMS Received", 12))
        else:
            contributions.append(("SMS Received", -8))
            
        if sel_dict.get("age", 30) < 18 or sel_dict.get("age", 30) > 60:
            contributions.append(("Age Factor", 8))
        else:
            contributions.append(("Age Factor", -3))
        
        contributions.append(("Neighborhood Risk", 10))
        contributions.append(("Past History", 5))
        
        features = [c[0] for c in contributions]
        values = [c[1] for c in contributions]
        colors   = [COLOR_PINK if v > 0 else COLOR_RISK_LOW for v in values]

        fig = go.Figure(go.Bar(
            x=values,
            y=features,
            orientation='h',
            marker_color=colors,
            text=[f"+{v}%" if v > 0 else f"{v}%" for v in values],
            textposition='outside',
        ))
        fig.update_layout(
            title=dict(text="Risk Factor Analysis", font=dict(size=14, family="DM Sans"), x=0.5),
            xaxis=dict(title="Contribution to Risk (%)", showgrid=True, gridcolor="#f0f2f7"),
            yaxis=dict(showgrid=False),
            plot_bgcolor="white",
            paper_bgcolor="white",
            margin=dict(l=10, r=40, t=40, b=40),
            height=280,
            font=dict(family="DM Sans", size=12),
            annotations=[dict(
                x=1, y=-0.18, xref='paper', yref='paper',
                text=f"Predicted Risk: {sel['risk']}%",
                showarrow=False,
                font=dict(size=12, color=COLOR_PINK, family="DM Sans"),
                xanchor='right'
            )]
        )
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        # btn
        b1, b2 = st.columns(2)
        with b1:
            st.button("📩  Send SMS", use_container_width=True)
        with b2:
            st.button("📋  View Detailed Record", use_container_width=True)