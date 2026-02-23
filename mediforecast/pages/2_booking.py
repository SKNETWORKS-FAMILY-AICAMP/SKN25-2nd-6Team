import streamlit as st
import base64
from pathlib import Path
from datetime import date, timedelta

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

# neighbourhood list (from neighbourhood.csv)
neighbourhoods = [
    "AEROPORTO", "ALEXANDRIA", "ANDORINHAS", "ANTÔNIO HONÓRIO", "ARIOVALDO FAVALESSA",
    "BELA VISTA", "BENTO FERREIRA", "BOA VISTA", "BONFIM", "CARATOÍRA",
    "CENTRO", "COMDUSA", "CONSOLAÇÃO", "CRUZAMENTO", "DA PENHA",
    "DE LOURDES", "DEMO", "DOBRADA", "DOM BOSCO", "ENSEADA DO SUÁ",
    "ESTRELINHA", "FONTE GRANDE", "FORTE SÃO JOÃO", "FRADINHOS", "GOIABEIRAS",
    "GURIGICA", "HORTO", "ILHA DAS CAIEIRAS", "ILHA DE SANTA MARIA", "ILHA DO BOI",
    "ILHA DO FRADE", "ILHA DO PRÍNCIPE", "ILHAS OCEÂNICAS DE TRINDADE", "INHANGUETÁ", "JABOUR",
    "JARDIM CAMBURI", "JARDIM DA PENHA", "JESUS DE NAZARETH", "JOANA D´ARC", "JUCUTUQUARA",
    "MARIA ORTIZ", "MARUÍPE", "MATA DA PRAIA", "MONTE BELO", "MORADA DE CAMBURI",
    "MUMBUCA", "NAZARETH", "NOVA PALESTINA", "PARQUE INDUSTRIAL", "PARQUE MOSCOSO",
    "PIEDADE", "PONTAL DE CAMBURI", "PRAIA DO CANTO", "PRAIA DO SUÁ", "REDENÇÃO",
    "REPÚBLICA", "RESISTÊNCIA", "ROMÃO", "SANTA CECÍLIA", "SANTA CLARA",
    "SANTA LUÍZA", "SANTA LÚCIA", "SANTA MARTHA", "SANTA TEREZA", "SANTO ANDRÉ",
    "SANTO ANTÔNIO", "SÃO BENEDITO", "SÃO CRISTÓVÃO", "SÃO JOSÉ", "SÃO PEDRO",
    "SEGURANÇA DO LAR", "SOLON BORGES", "TABUAZEIRO", "UNIVERSITY OF ESPÍRITO SANTO", "VILA RUBIM"
]

st.markdown(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

#MainMenu, header, footer {{ visibility: hidden; }}
[data-testid="stHeader"] {{ display: none; }}
[data-testid="stSidebar"] {{ display: none; }}
[data-testid="stSidebarNav"] {{ display: none; }}
section[data-testid="stSidebar"] {{ display: none; }}

html, body, [class*="css"] {{
    font-family: 'DM Sans', sans-serif;
    background-color: #f4f6f9;
}}
.main {{ background-color: #f4f6f9; }}
.block-container {{ padding-top: 0 !important; max-width: 720px !important; }}

/* 상단 헤더 */
.page-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 0 20px 0;
    animation: fadeIn 0.7s ease both;
}}
.back-btn {{
    font-size: 0.88rem;
    color: #85AAD0;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: opacity 0.15s;
}}
.back-btn:hover {{ opacity: 0.7; }}

/* 폼 카드 */
.form-card {{
    background: white;
    border-radius: 24px;
    padding: 36px 40px;
    box-shadow: 0 2px 20px rgba(0,0,0,0.06);
    animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both;
    margin-bottom: 24px;
}}
@keyframes fadeUp {{
    from {{ opacity: 0; transform: translateY(20px); }}
    to   {{ opacity: 1; transform: translateY(0); }}
}}
@keyframes fadeIn {{
    from {{ opacity: 0; }} to {{ opacity: 1; }}
}}

.form-title {{
    font-size: 1.35rem;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 4px;
}}
.form-subtitle {{
    font-size: 0.88rem;
    color: #8a93a8;
    margin-bottom: 28px;
}}
.section-label {{
    font-size: 0.78rem;
    font-weight: 700;
    color: #8a93a8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
    margin-top: 24px;
}}

/* Streamlit input 스타일 */
[data-testid="stTextInput"] input,
[data-testid="stSelectbox"] div[data-baseweb="select"],
[data-testid="stDateInput"] input,
[data-testid="stTextArea"] textarea {{
    border-radius: 12px !important;
    border: 1.5px solid #e0e4ef !important;
    font-family: 'DM Sans', sans-serif !important;
    font-size: 0.92rem !important;
    background: #fafbfd !important;
    transition: border-color 0.2s !important;
}}
[data-testid="stTextInput"] input:focus,
[data-testid="stTextArea"] textarea:focus {{
    border-color: #85AAD0 !important;
    box-shadow: 0 0 0 3px rgba(133,170,208,0.15) !important;
}}

/* 체크박스 */
[data-testid="stCheckbox"] label {{
    font-size: 0.92rem !important;
    font-weight: 500 !important;
    color: #1a1a2e !important;
}}

/* 라디오 */
[data-testid="stRadio"] label {{
    font-size: 0.92rem !important;
}}

/* 제출 버튼 */
div.stButton > button {{
    width: 100%;
    height: 52px;
    border-radius: 14px;
    border: none !important;
    background: linear-gradient(135deg, #85AAD0, #6990B8) !important;
    color: white !important;
    font-family: 'DM Sans', sans-serif !important;
    font-size: 1rem !important;
    font-weight: 700 !important;
    cursor: pointer;
    transition: all 0.2s ease !important;
    box-shadow: 0 4px 14px rgba(105,144,184,0.4) !important;
    letter-spacing: 0.02em;
}}
div.stButton > button:hover {{
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 20px rgba(105,144,184,0.5) !important;
}}

/* success 메시지 */
[data-testid="stSuccess"] {{
    border-radius: 14px !important;
}}

/* label 폰트 */
label {{ font-weight: 600 !important; color: #1a1a2e !important; font-size: 0.88rem !important; }}
</style>

<div class="page-header">
    <a class="back-btn" href="/" target="_self">← Back to Home</a>
    <img src="data:image/png;base64,{logo_b64}" style="height: 36px; object-fit: contain;" />
</div>

<div class="form-card">
    <div class="form-title">Book an Appointment</div>
    <div class="form-subtitle">Please fill in your details to schedule a visit.</div>
</div>
""", unsafe_allow_html=True)

with st.container():
    st.markdown('<div class="form-card">', unsafe_allow_html=True)

    # information
    st.markdown('<div class="section-label">Personal Information</div>', unsafe_allow_html=True)
    col1, col2 = st.columns(2)
    with col1:
        name = st.text_input("Full Name", placeholder="e.g. Jane Smith")
    with col2:
        gender = st.radio("Gender", ["Female", "Male"], horizontal=True)

    age = st.number_input("Age", min_value=0, max_value=120, value=30, step=1)

    # neighbourhood
    st.markdown('<div class="section-label">Neighbourhood</div>', unsafe_allow_html=True)
    neighbourhood = st.selectbox("Neighbourhood", ["Select your neighbourhood..."] + neighbourhoods)

    # underlying disease
    st.markdown('<div class="section-label">Medical Conditions</div>', unsafe_allow_html=True)
    col3, col4, col5 = st.columns(3)
    with col3:
        hypertension = st.checkbox("Hypertension")
    with col4:
        diabetes = st.checkbox("Diabetes")
    with col5:
        alcoholism = st.checkbox("Alcoholism")

    # scholarship
    st.markdown('<div class="section-label">Scholarship</div>', unsafe_allow_html=True)
    scholarship = st.checkbox("I am currently receiving a government scholarship (Bolsa Família)")

    # appointment
    st.markdown('<div class="section-label">Appointment Date</div>', unsafe_allow_html=True)
    appt_date = st.date_input(
        "Preferred Date",
        min_value=date.today() + timedelta(days=1),
        value=date.today() + timedelta(days=3)
    )

    # symptoms
    st.markdown('<div class="section-label">Symptoms</div>', unsafe_allow_html=True)
    symptoms = st.text_area(
        "Describe your symptoms",
        placeholder="Please describe your symptoms or reason for visit...",
        height=120
    )

    st.markdown("<div style='height: 8px'></div>", unsafe_allow_html=True)

    # submit
    if st.button("Submit Appointment Request"):
        if not name:
            st.error("Please enter your full name.")
        elif neighbourhood == "Select your neighbourhood...":
            st.error("Please select your neighbourhood.")
        elif not symptoms:
            st.error("Please describe your symptoms.")
        else:
            st.success(f"✅ Appointment request submitted! We'll confirm your visit on **{appt_date.strftime('%B %d, %Y')}**.")

    st.markdown('</div>', unsafe_allow_html=True)