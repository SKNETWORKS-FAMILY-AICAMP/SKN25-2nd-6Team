import streamlit as st
import streamlit.components.v1 as components
import base64
from pathlib import Path

st.set_page_config(
    page_title="MediForecast",
    page_icon="🏥",
    layout="centered",
    initial_sidebar_state="collapsed"
)

# logo as base64
logo_b64 = base64.b64encode(
    Path(__file__).parent.joinpath("static", "logo.png").read_bytes()
).decode()

# ── CSS: UI 숨기기 + 버튼 카드 스타일 ──
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

#MainMenu, header, footer { visibility: hidden; }
[data-testid="stHeader"]      { display: none; }
[data-testid="stSidebar"]     { display: none; }
[data-testid="stSidebarNav"]  { display: none; }
section[data-testid="stSidebar"] { display: none; }

html, body, [class*="css"] {
    font-family: 'DM Sans', sans-serif;
    background-color: #ffffff;
}
.main { background-color: #ffffff; }

/* ── 버튼 카드 ── */
.btn-row {
    display: flex;
    gap: 24px;
    justify-content: center;
}

a.role-btn,
a.role-btn:visited,
a.role-btn:active,
a.role-btn:focus {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 210px;
    height: 190px;
    border-radius: 20px;
    overflow: hidden;
    border: 2px solid #e0e4ef;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    text-decoration: none;
    color: inherit;
    outline: none;
}
a.role-btn:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0,0,0,0.12);
    border-radius: 20px;
}
a.role-btn.patient:hover  { border-color: #8AC19A; background: #f4fbf6; }
a.role-btn.hospital:hover { border-color: #85AAD0; background: #f0f6fc; }

a.role-btn img,
a.role-btn:visited img,
a.role-btn:active img,
a.role-btn:focus img {
    border-radius: 0;
}

.btn-img   { width: 56px; height: 56px; object-fit: contain; border-radius: 0; }
.btn-label { font-size: 1.2rem; font-weight: 700; color: #1a1a2e; }
.btn-sub   { font-size: 0.78rem; color: #8a93a8; font-weight: 400; }
</style>
""", unsafe_allow_html=True)

components.html(f"""
<!DOCTYPE html>
<html>
<head>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
* {{ margin: 0; padding: 0; box-sizing: border-box; font-family: 'DM Sans', sans-serif; }}
html, body {{ background-color: #ffffff; }}

.header {{
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 80px 20px 16px;
}}
.logo-container {{
    animation: fadeSlideDown 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
}}
@keyframes fadeSlideDown {{
    from {{ opacity: 0; transform: translateY(-28px); }}
    to   {{ opacity: 1; transform: translateY(0); }}
}}
.subtitle {{
    animation: fadeIn 1.1s ease 0.4s both;
    font-size: 1.1rem;
    color: #6b7a99;
    font-weight: 400;
    margin-top: 12px;
    letter-spacing: 0.01em;
}}
@keyframes fadeIn {{
    from {{ opacity: 0; transform: translateY(10px); }}
    to   {{ opacity: 1; transform: translateY(0); }}
}}
</style>
</head>
<body>
<div class="header">
    <div class="logo-container">
        <img src="data:image/png;base64,{logo_b64}" style="height: 130px; object-fit: contain;" />
    </div>
    <div class="subtitle">Your AI-powered hospital appointment management platform</div>
</div>
</body>
</html>
""", height=280)

# ── 네비게이션 버튼 (iframe 밖 = 페이지 이동 정상 작동) ──
st.markdown("""
<div class="btn-row">
    <a class="role-btn patient" href="/booking">
        <img class="btn-img" src="https://cdn-icons-png.flaticon.com/512/2785/2785482.png" />
        <div class="btn-label">Patient</div>
        <div class="btn-sub">Book an appointment</div>
    </a>
    <a class="role-btn hospital" href="/dashboard">
        <img class="btn-img" src="https://cdn-icons-png.flaticon.com/512/2382/2382461.png" />
        <div class="btn-label">Hospital Staff</div>
        <div class="btn-sub">View dashboard</div>
    </a>
</div>
""", unsafe_allow_html=True)
