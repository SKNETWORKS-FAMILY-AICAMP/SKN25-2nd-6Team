import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from datetime import datetime

# color set
COLOR_BLUE      = "#85AAD0"   # Today, Weather
COLOR_BLUE_DARK = "#6990B8"   # blue gradation
COLOR_PINK      = "#F57E76"   # No-Show Rate card / Risk High
COLOR_PINK_DARK = "#D9605A"   # pink gradation
COLOR_RISK_HIGH = "#F57E76"   # Risk ≥ 65%
COLOR_RISK_MED  = "#FFC782"   # Risk ≥ 45%
COLOR_RISK_LOW  = "#8AC19A"   # Risk < 45%
COLOR_SELECTED  = "#85AAD0"

# page set (임시)
st.set_page_config(
    page_title="NoShow Predictor",
    page_icon="🏥",
    layout="wide",
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

/* 환자 리스트 스크롤 */
.patient-list-scroll {{
    max-height: 480px;
    overflow-y: auto;
    padding-right: 4px;
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
</style>
""", unsafe_allow_html=True)

# dummy data
appointments = [
    {"name": "Yeonjeong Park", "gender": "F", "time": "09:00 AM", "risk": 75},
    {"name": "Minseo Cho",     "gender": "F", "time": "09:30 AM", "risk": 37},
    {"name": "Jihyun Kim",     "gender": "F", "time": "10:00 AM", "risk": 10},
    {"name": "Jihyun Park",    "gender": "F", "time": "10:30 AM", "risk": 6},
    {"name": "Yeonjun Kim",    "gender": "M", "time": "11:00 AM", "risk": 50},
    {"name": "Channwoong Seo", "gender": "M", "time": "11:30 AM", "risk": 82}
]

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

# 상단 카드
c1, c2, c3, c4 = st.columns([1.2, 1, 1, 1])

with c1:
    st.markdown("""
    <div class="card-project">
        <div class="proj-name">🏥 NoShow Predictor</div>
    </div>""", unsafe_allow_html=True)

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
    st.markdown("""
    <div class="top-card card-weather">
        <div class="icon">☀️</div>
        <div>
            <div class="label">Weather</div>
            <div class="value">Sunny, 25 °C</div>
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

st.markdown("<div style='height:18px'></div>", unsafe_allow_html=True)


# main panel
left, right = st.columns([1, 1.3], gap="large")

# left - appointment list
with left:
    with st.container(border=True):
        st.markdown('<div class="section-title">Appointments</div>', unsafe_allow_html=True)

        search = st.text_input("", placeholder="🔍  Search patient...", label_visibility="collapsed")

        filtered = [a for a in appointments if search.lower() in a["name"].lower()] if search else appointments

        # 카드 HTML. st.html은 iframe이므로 CSS를 포함
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

        # SHAP plot (dummy data)
        features = ["Lead Time", "SMS Received", "Past No-Shows", "Age", "Neighborhood"]
        values   = [18, 15, 22, -8, 10]
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
            title=dict(text="Why High Risk?", font=dict(size=14, family="DM Sans"), x=0.5),
            xaxis=dict(title="Contribution to Risk (%)", showgrid=True, gridcolor="#f0f2f7"),
            yaxis=dict(showgrid=False),
            plot_bgcolor="white",
            paper_bgcolor="white",
            margin=dict(l=10, r=40, t=40, b=40),
            height=280,
            font=dict(family="DM Sans", size=12),
            annotations=[dict(
                x=1, y=-0.18, xref='paper', yref='paper',
                text=f"Total Risk: {sel['risk']}%",
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