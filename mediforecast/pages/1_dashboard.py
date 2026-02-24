import base64
from datetime import datetime
from pathlib import Path

import numpy as np
import plotly.graph_objects as go
import streamlit as st

# utils
from utils.constants import COLOR_PINK, COLOR_RISK_LOW, COLOR_RISK_MED, COLOR_RISK_HIGH, COLOR_SELECTED
from utils.demo_data import get_todays_appointments
from utils.ml_utils import load_model, prepare_features, compute_shap_values
from utils.ui_helpers import (
    get_dashboard_css, get_patient_card_css,
    risk_class, build_patient_card_html, show_patient_record,
)
from utils.weather_api import fetch_weather

st.set_page_config(
    page_title="NoShow Predictor",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="collapsed",
)
st.markdown(get_dashboard_css(), unsafe_allow_html=True)

# Load model, data, weather
try:
    model = load_model()
    patients_df = get_todays_appointments()
    weather_icon, weather_text, weather_detail = fetch_weather()

    appointments = []
    for _, row in patients_df.iterrows():
        X = prepare_features(row.to_dict(), weather_detail)
        risk = int(model.predict_proba(X)[0, 1] * 100)
        appointments.append({**row.to_dict(), "risk": risk})

except Exception as e:
    st.error(f"Error loading data: {e}")
    appointments = []
    weather_icon, weather_text, weather_detail = "⚠️", "Weather data unavailable", None

for a in appointments:
    if "lead_time" not in a:
        a["lead_time"] = a.get("lead_time_days", 0)

if "selected" not in st.session_state:
    st.session_state.selected = 0

# URL query parameters (?sel=N) → session_state synchronization
_sel_param = st.query_params.get("sel")
if _sel_param is not None:
    try:
        _sel_idx = int(_sel_param)
        if 0 <= _sel_idx < len(appointments):
            st.session_state.selected = _sel_idx
    except (ValueError, TypeError):
        pass

# logo
logo_b64 = base64.b64encode(
    Path(__file__).parent.parent.joinpath("static", "logo.png").read_bytes()
).decode()

# Top cards
c1, c2, c3, c4 = st.columns([0.7, 1, 1, 1])

with c1:
    st.markdown(f'<img src="data:image/png;base64,{logo_b64}" width="220">', unsafe_allow_html=True)

with c2:
    today = datetime.now().strftime("%Y - %m - %d")
    st.markdown(f"""
    <div class="top-card card-date">
        <div class="icon">📅</div>
        <div><div class="label">Today</div><div class="value">{today}</div></div>
    </div>""", unsafe_allow_html=True)

with c3:
    st.markdown(f"""
    <div class="top-card card-weather">
        <div class="icon">{weather_icon}</div>
        <div><div class="label">Weather (Vitória)</div><div class="value">{weather_text}</div></div>
    </div>""", unsafe_allow_html=True)

with c4:
    avg_risk = int(np.mean([a["risk"] for a in appointments])) if appointments else 0
    st.markdown(f"""
    <div class="top-card card-noshow">
        <div class="icon">⚠️</div>
        <div><div class="label">NO-SHOW RATE</div><div class="value">{avg_risk}%</div></div>
    </div>""", unsafe_allow_html=True)

st.markdown('<div style="height: 24px"></div>', unsafe_allow_html=True)

# Main content split into two columns
left, right = st.columns([1, 1.8], gap="small")

# Left: Appointment list
with left:
    with st.container(border=True):
        st.markdown('<div class="section-title">Appointments</div>', unsafe_allow_html=True)
        search = st.text_input("", placeholder="🔍  Search patient...", label_visibility="collapsed")

        filtered = [a for a in appointments if search.lower() in a["name"].lower()] if search else appointments

        cards_html = ""
        for appt in filtered:
            idx = appointments.index(appt)
            is_sel = idx == st.session_state.selected
            cards_html += build_patient_card_html(appt, idx, is_sel)

        card_css = get_patient_card_css()
        st.html(f"{card_css}<div class='patient-list-scroll'>{cards_html}</div>")

# Right: Risk analysis
with right:
    with st.container(border=True):
        st.markdown('<div class="section-title">Patient Risk Analysis</div>', unsafe_allow_html=True)

        sel = appointments[st.session_state.selected]
        g_icon = "👩" if sel["gender"] == "F" else "👨"
        g_text = "Female" if sel["gender"] == "F" else "Male"

        st.markdown(f"""
        <div class="profile-box">
            <div class="big-avatar">{g_icon}</div>
            <div class="profile-info">
                <strong>{sel['name']}</strong>
                <p>Gender : {g_text}</p>
                <p>Appointment : {sel['time']}</p>
            </div>
        </div>""", unsafe_allow_html=True)

        # ─── SHAP risk factor chart ───
        # Recompute feature matrix for selected patient (includes live weather)
        sel_X = prepare_features(sel, weather_detail)
        shap_labels, shap_values = compute_shap_values(model, sel_X, top_n=8)

        if shap_labels:
            features = shap_labels
            values   = shap_values
        else:
            # Minimal fallback when CatBoost Pool import fails
            features = ["Lead Time (days)", "SMS Received", "Personal No-show Rate",
                        "Neighbourhood No-show Rate", "First Visit"]
            values   = [
                 0.3 if sel.get("lead_time_days", 0) > 7 else -0.1,
                -0.2 if sel.get("sms_received")         else  0.2,
                 sel.get("patient_noshow_rate", 0.2) - 0.2,
                 sel.get("nhood_noshow_rate",   0.2) - 0.2,
                 0.15 if sel.get("is_first_visit")       else -0.05,
            ]

        # Map risk_class CSS name → hex color for Plotly
        _CLASS_COLOR = {
            "risk-high":   COLOR_RISK_HIGH,
            "risk-medium": COLOR_RISK_MED,
            "risk-low":    COLOR_RISK_LOW,
        }
        bar_colors = [
            COLOR_RISK_HIGH if v > 0 else COLOR_RISK_LOW
            for v in values
        ]

        # SHAP values are log-odds contributions; show sign + magnitude
        def _shap_label(v: float) -> str:
            return f"+{v:.3f}" if v >= 0 else f"{v:.3f}"

        fig = go.Figure(go.Bar(
            x=values,
            y=features,
            orientation="h",
            marker_color=bar_colors,
            text=[_shap_label(v) for v in values],
            textposition="outside",
            hovertemplate="%{y}: %{x:.4f}<extra></extra>",
        ))
        fig.update_layout(
            title=dict(
                text="Why this risk? — SHAP Feature Contributions",
                font=dict(size=13, family="DM Sans"),
                x=0,
                xanchor="left",
                pad=dict(l=4),
            ),
            xaxis=dict(
                title="SHAP value  (→ higher no-show risk)",
                showgrid=True,
                gridcolor="#f0f2f7",
                zeroline=True,
                zerolinecolor="#cccccc",
                zerolinewidth=1.5,
            ),
            yaxis=dict(showgrid=False, automargin=True),
            plot_bgcolor="white",
            paper_bgcolor="white",
            margin=dict(l=10, r=60, t=44, b=10),
            height=300,
            font=dict(family="DM Sans", size=11),
        )
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        # Predicted risk label (shown below chart)
        risk_color = _CLASS_COLOR[risk_class(sel["risk"])]
        st.markdown(
            f"<div style='text-align:right; margin-top:-8px; margin-bottom:12px;"
            f" font-size:13px; font-family:DM Sans; color:{risk_color};'>"
            f"Predicted No-show Risk : <b>{sel['risk']}%</b></div>",
            unsafe_allow_html=True,
        )

        # Buttons
        b1, b2 = st.columns(2)
        with b1:
            st.button("📩  Send SMS", use_container_width=True)
        with b2:
            if st.button("📋  View Detailed Record", use_container_width=True):
                show_patient_record(sel)
