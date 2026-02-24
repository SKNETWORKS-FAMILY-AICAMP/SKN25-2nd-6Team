import streamlit as st

from utils.constants import (
    COLOR_BLUE, COLOR_BLUE_DARK, COLOR_PINK, COLOR_PINK_DARK,
    COLOR_RISK_HIGH, COLOR_RISK_MED, COLOR_RISK_LOW,
    COLOR_SELECTED,
    neighbourhood_label,
)

# CSS helpers
def get_dashboard_css() -> str:
    return f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono&display=swap');

html, body, [class*="css"] {{ font-family: 'DM Sans', sans-serif; }}

#MainMenu, header, footer {{ visibility: hidden; }}
[data-testid="stHeader"] {{ display: none; }}
[data-testid="stSidebar"] {{ display: none; }}
[data-testid="stSidebarNav"] {{ display: none; }}
section[data-testid="stSidebar"] {{ display: none; }}

.main {{ background-color: #f4f6f9; }}

.top-card {{
    border-radius: 16px; padding: 18px 22px;
    display: flex; align-items: center; gap: 14px;
    color: white; font-weight: 600;
}}
.top-card .icon {{ font-size: 2rem; }}
.top-card .label {{ font-size: 0.75rem; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em; }}
.top-card .value {{ font-size: 1.35rem; font-weight: 700; }}

.card-date    {{ background: linear-gradient(135deg, {COLOR_BLUE}, {COLOR_BLUE_DARK}); }}
.card-weather {{ background: linear-gradient(135deg, {COLOR_BLUE}, {COLOR_BLUE_DARK}); }}
.card-noshow  {{ background: linear-gradient(135deg, {COLOR_PINK}, {COLOR_PINK_DARK}); }}

div[data-testid="stVerticalBlockBorderWrapper"]:has(> div > div > div[data-testid="stVerticalBlock"]) {{
    background: white; border-radius: 20px; padding: 24px; border: none;
}}

.section-title {{ font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin-bottom: 16px; }}

.profile-box {{
    background: #f8f9fc; border-radius: 14px;
    padding: 16px 20px; display: flex; align-items: center; gap: 16px; margin-bottom: 16px;
}}
.big-avatar {{
    width: 64px; height: 64px; border-radius: 50%; background: #dde4f5;
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem; flex-shrink: 0;
}}
.profile-info p {{ margin: 2px 0; font-size: 0.88rem; color: #444; }}
.profile-info strong {{ font-size: 1rem; color: #1a1a2e; }}

[data-testid="stImage"] {{ display: flex; justify-content: center; align-items: center; }}

/* Fixed height matching for left / right panels */
div[data-testid="stVerticalBlockBorderWrapper"]:has(> div > div > div[data-testid="stVerticalBlock"]) {{
    min-height: 620px;
}}
</style>
"""

def get_patient_card_css() -> str:
    """st.html iframe 안에서 사용하는 patient list card CSS."""
    return f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
* {{ margin: 0; padding: 0; box-sizing: border-box; font-family: 'DM Sans', sans-serif; }}
body {{ background: transparent; }}
.patient-list-scroll {{ max-height: 490px; overflow-y: auto; padding-right: 4px; }}
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
.badge-stack {{
    display: flex; flex-direction: column;
    align-items: flex-end; gap: 5px; flex-shrink: 0;
}}
.emg-badge {{
    padding: 4px 10px; border-radius: 20px;
    font-weight: 700; font-size: 0.78rem;
    color: white; background: {COLOR_RISK_HIGH};
    white-space: nowrap;
    animation: emg-pulse 1.4s ease-in-out infinite;
}}
@keyframes emg-pulse {{
    0%, 100% {{ opacity: 1; }}
    50%       {{ opacity: 0.55; }}
}}
a {{ text-decoration: none; color: inherit; display: block; }}
</style>
"""

def get_modal_css() -> str:
    return f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
* {{ font-family: 'DM Sans', sans-serif; }}
.record-section {{
    font-size: 0.88rem; font-weight: 700; color: #3a3f50;
    text-transform: uppercase; letter-spacing: 0.06em; margin: 20px 0 10px 0;
}}
.record-row {{
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0; border-bottom: 1px solid #f0f2f7; font-size: 0.92rem;
}}
.record-label {{ color: #8a93a8; font-weight: 600; }}
.record-value {{ color: #1a1a2e; font-weight: 500; }}
.condition-badge {{
    display: inline-block; padding: 3px 12px; border-radius: 20px;
    font-size: 0.8rem; font-weight: 600; background: #eef4fb; color: {COLOR_BLUE_DARK};
    margin-right: 6px; margin-bottom: 4px;
}}
.emergency-badge-0 {{
    display: inline-block; padding: 4px 14px; border-radius: 20px;
    font-size: 0.85rem; font-weight: 700; background: #e8f5e9; color: #388e3c;
}}
.emergency-badge-1 {{
    display: inline-block; padding: 4px 14px; border-radius: 20px;
    font-size: 0.85rem; font-weight: 700; background: #fdecea; color: {COLOR_PINK_DARK};
}}
.symptoms-box {{
    background: #f8f9fc; border-radius: 10px; padding: 12px 14px;
    font-size: 0.9rem; color: #1a1a2e; line-height: 1.6; margin-top: 8px;
}}
</style>
"""

def risk_class(risk: int) -> str:
    if risk >= 65:
        return "risk-high"
    if risk >= 45:
        return "risk-medium"
    return "risk-low"

def build_patient_card_html(appt: dict, original_idx: int, is_selected: bool) -> str:
    rc = risk_class(appt["risk"])
    icon = "👩" if appt["gender"] == "F" else "👨"
    sel_cls = " selected" if is_selected else ""
    emg = appt.get("emergency", 0)
    emg_badge = '<div class="emg-badge">🚨 EMG</div>' if emg else ""
    return f"""
<a href="?sel={original_idx}" target="_parent">
    <div class="patient-card{sel_cls}">
        <div class="avatar">{icon}</div>
        <div class="patient-info">
            <div class="patient-name">{appt['name']} / {appt['gender']}</div>
            <div class="patient-time">{appt['time']}</div>
        </div>
        <div class="badge-stack">
            {emg_badge}
            <div class="risk-badge {rc}">Risk : {appt['risk']}%</div>
        </div>
    </div>
</a>
"""


@st.dialog("Patient Detailed Record")
def show_patient_record(patient: dict) -> None:
    g_text = "Female" if patient["gender"] == "F" else "Male"
    g_icon = "👩" if patient["gender"] == "F" else "👨"

    # Medical conditions badges
    _HANDICAP_LABEL = {1: "Handicap Lv.1 (Mild)", 2: "Handicap Lv.2 (Moderate)",
                       3: "Handicap Lv.3 (Severe)", 4: "Handicap Lv.4 (Profound)"}
    handicap_val = int(patient.get("has_handicap", 0))
    conditions_html = "".join(
        f'<span class="condition-badge">{label}</span>'
        for flag, label in [
            (patient.get("has_hypertension"), "Hypertension"),
            (patient.get("has_diabetes"),     "Diabetes"),
            (patient.get("has_alcoholism"),   "Alcoholism"),
            (handicap_val, _HANDICAP_LABEL.get(handicap_val, "")),
        ]
        if flag
    ) or '<span style="color:#8a93a8; font-size:0.88rem;">None reported</span>'

    # Scholarship
    scholarship_html = "✅ Yes" if patient.get("scholarship") else "❌ No"

    # Emergency (default 0)
    emergency_val = patient.get("emergency", 0)
    emergency_html = (
        '<span class="emergency-badge-1">Emergency</span>'
        if emergency_val == 1
        else '<span class="emergency-badge-0">Non-Emergency</span>'
    )

    # Neighbourhood
    nhood = neighbourhood_label(patient.get("neighbourhood"))

    st.markdown(get_modal_css(), unsafe_allow_html=True)
    st.markdown(f"""
    <!-- Identity -->
    <div class="record-section">Patient Information</div>
    <div class="record-row">
        <span class="record-label">Patient ID</span>
        <span class="record-value">{patient.get('patient_id', 'N/A')}</span>
    </div>
    <div class="record-row">
        <span class="record-label">Full Name</span>
        <span class="record-value">{g_icon} {patient['name']}</span>
    </div>
    <div class="record-row">
        <span class="record-label">Gender</span>
        <span class="record-value">{g_text}</span>
    </div>
    <div class="record-row">
        <span class="record-label">Age</span>
        <span class="record-value">{patient['age']} years old</span>
    </div>
    <div class="record-row">
        <span class="record-label">Neighbourhood</span>
        <span class="record-value">{nhood}</span>
    </div>

    <!-- Medical -->
    <div class="record-section">Medical Conditions</div>
    <div style="padding: 10px 0; border-bottom: 1px solid #f0f2f7;">
        {conditions_html}
    </div>

    <!-- Scholarship -->
    <div class="record-section">Scholarship</div>
    <div class="record-row">
        <span class="record-label">Bolsa Família</span>
        <span class="record-value">{scholarship_html}</span>
    </div>

    <!-- Symptoms -->
    <div class="record-section">Symptoms</div>
    <div class="record-row">
        <span class="record-label">Emergency</span>
        <span class="record-value">{emergency_html}</span>
    </div>
    <div class="symptoms-box">{patient.get('symptoms', 'No symptoms recorded.')}</div>
    """, unsafe_allow_html=True)
