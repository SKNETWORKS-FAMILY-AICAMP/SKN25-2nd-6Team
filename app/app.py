import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from datetime import datetime
import os

# 1. 페이지 설정 및 디자인
st.set_page_config(layout="wide", page_title="Medical No-Show Dashboard")

st.markdown("""
    <style>
    .main { background-color: #f8f9fa; }
    [data-testid="stMetric"] { 
        background-color: white; 
        border-radius: 15px; 
        padding: 15px; 
        box-shadow: 0 4px 6px rgba(0,0,0,0.05); 
        border-top: 5px solid #4DABF7;
    }
    .stButton>button { width: 100%; border-radius: 10px; font-weight: bold; }
    </style>
    """, unsafe_allow_html=True)

# 2. 데이터 처리 로직 (파일 불러오기만 수행)
@st.cache_data
def load_data():
    file_path = os.path.join('data', 'unique_30.csv')
    
    if not os.path.exists(file_path):
        st.error(f"데이터 파일({file_path})을 찾을 수 없습니다. 경로를 확인해주세요.")
        return pd.DataFrame()

    # 데이터 읽기
    df = pd.read_csv(file_path)
    
    # 컬럼명 앞뒤 공백 제거 및 표준화
    df.columns = df.columns.str.strip()
    if 'No-Show' in df.columns:
        df.rename(columns={'No-Show': 'No-show'}, inplace=True)

    # 날짜 데이터 처리
    df['ScheduledDay'] = pd.to_datetime(df['ScheduledDay'], format='ISO8601')
    df['AppointmentDay'] = pd.to_datetime(df['AppointmentDay'], format='ISO8601')
    
    # Lead Time(대기 기간) 계산
    df['LeadTime'] = (df['AppointmentDay'].dt.date - df['ScheduledDay'].dt.date).dt.days
    
    # 가상 이름 생성 (설계안 재현용)
    names = ["Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim"]
    df['PatientName'] = [f"{names[i%10]} {str(pid)[-4:]}" for i, pid in enumerate(df['PatientId'])]
    
    return df

# 데이터 로드
df = load_data()

if not df.empty:
    # --- 상단 레이아웃 (4개 카드) ---
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Project", "No-Show AI")
    with col2:
        st.metric("Today", datetime.now().strftime("%Y-%m-%d"))
    with col3:
        st.metric("Weather", "Sunny, 25°C")
    with col4:
        # No-show 비율 계산
        ns_rate = (df['No-show'].str.upper() == 'YES').mean() * 100
        st.metric("NO-SHOW RATE", f"{ns_rate:.1f}%")

    st.write("---")

    # --- 메인 레이아웃 (좌: 리스트, 우: 상세분석) ---
    left_col, right_col = st.columns([1.2, 2.5])

    with left_col:
        st.subheader("Appointments")
        search = st.text_input("🔍 Search Name...")
        
        filtered = df[df['PatientName'].str.contains(search, case=False)]
        
        if not filtered.empty:
            options = filtered['PatientId'].tolist()
            names_map = {row['PatientId']: f"{row['PatientName']} / {row['Gender']}" for _, row in filtered.iterrows()}
            
            selected_id = st.radio("Select Patient", options, format_func=lambda x: names_map[x], label_visibility="collapsed")
            curr = df[df['PatientId'] == selected_id].iloc[0]
        else:
            st.warning("검색 결과가 없습니다.")
            st.stop()

    with right_col:
        st.subheader("Patient Risk Analysis")
        
        with st.container(border=True):
            p_col1, p_col2 = st.columns([1, 4])
            with p_col1:
                st.markdown("<h1 style='text-align: center;'>👤</h1>", unsafe_allow_html=True)
            with p_col2:
                st.write(f"**Name:** {curr['PatientName']}")
                st.write(f"**Gender:** {'Female' if curr['Gender']=='F' else 'Male'} | **Age:** {curr['Age']}")
                st.caption("환자별 리스크 요인 분석 결과")

            # --- 리스크 요인 계산 (Waterfall Chart) ---
            base_risk = 20
            lt_score = 25 if curr['LeadTime'] > 7 else 5
            sms_score = -10 if curr['SMS_received'] == 1 else 15
            
            # 질환 관련 가중치 (컬럼 존재 여부 확인 후 계산)
            health_score = 0
            if curr.get('Hipertension', 0) == 1: health_score += 5
            if curr.get('Diabetes', 0) == 1: health_score += 5
            
            total_risk = base_risk + lt_score + sms_score + health_score
            total_risk = max(0, min(100, total_risk))

            # 폭포 차트 (Waterfall Chart)
            fig = go.Figure(go.Waterfall(
                orientation="v",
                measure=["relative", "relative", "relative", "relative", "total"],
                x=["Base Risk", "Lead Time", "SMS Info", "Health Factor", "Total Risk"],
                y=[base_risk, lt_score, sms_score, health_score, total_risk],
                text=[f"+{base_risk}", f"+{lt_score}", f"{sms_score}", f"+{health_score}", f"{total_risk}%"],
                textposition="outside",
                increasing={"marker": {"color": "#FF6B6B"}}, 
                decreasing={"marker": {"color": "#51CF66"}}, 
                totals={"marker": {"color": "#4DABF7"}}     
            ))

            fig.update_layout(
                title={"text": "Contribution to No-Show Risk", "x": 0.5},
                height=350,
                showlegend=False,
                margin=dict(l=10, r=10, t=50, b=10)
            )
            st.plotly_chart(fig, use_container_width=True)

            b1, b2 = st.columns(2)
            with b1:
                st.button("✉️ Send SMS Message")
            with b2:
                st.button("📋 View Medical Records")
else:
    st.info("data/unique_30.csv 파일을 읽지 못했습니다.")