# SKN25-2nd-6Team
> 딥러닝·머신러닝 기반 응급도 분류 및 노쇼 예측 환자 관리 시스템

</br>

## 1. 팀 소개

<table>
  <tr>
    <th width="20%"><img src="./img/docs/yjeong.png" width="100"><br><b>박연정</b></th>
    <th width="20%"><img src="./img/docs/jhk.jpg" width="100"><br><b>김지현</b></th>
    <th width="20%"><img src="./img/docs/minseo.jpg" width="100"><br><b>조민서</b></th>
    <th width="20%"><img src="./img/docs/yjun.jpg" width="100"><br><b>김연준</b></th>
    <th width="20%"><img src="./img/docs/jh.png" width="100"><br><b>박지현</b></th>
  </tr>
  <tr>
    <td align="center"><b>팀장 / Leader</b></td>
    <td align="center"><b>팀원</b></td>
    <td align="center"><b>팀원</b></td>
    <td align="center"><b>팀원</b></td>
    <td align="center"><b>팀원</b></td>
  </tr>
  <tr>
    <td valign="top">
      • 데이터셋 조사 및 전처리<br>
      • XGBoost, CatBoost 모델링<br>
      • 산출물 보고서 작성<br>
      • ERD 설계<br>
      • UI/UX 기획<br>
      • 발표자
    </td>
    <td valign="top">
      • 데이터셋 조사<br>
      • Logistic 회귀 분석 모델링<br>
      • 발표자료 작성
    </td>
    <td valign="top">
      • 데이터셋 조사 및 전처리<br>
      • LightGBM 모델링<br>
      • MLflow 구현<br>
      • 산출물 보고서 작성
    </td>
    <td valign="top">
      • 딥러닝<br>
      • 응급/비응급 분류 모델 개발<br>
      • 발표자
    </td>
    <td valign="top">
      • 프로젝트 계획 수립 참여<br>
      • 데이터셋 조사
    </td>
  </tr>
</table>

<br>



## 2. 프로젝트 기간

2026.02.19 ~ 2026.02.24 (6일)

</br>

## 3. 프로젝트 개요

### 프로젝트명

**MediForecast**
> Predictive Healthcare Analytics

<br>

### 프로젝트 배경 및 목적

병원 예약 후 당일 미방문(No-Show)은 의료 자원의 낭비와 진료 공백을 유발하는 주요 문제이다.  
본 프로젝트는 환자의 예약 정보, 날씨, 지역 등 다양한 변수를 활용하여 **No-Show 발생 가능성을 사전에 예측**하고,  
나아가 환자의 증상 텍스트를 기반으로 **응급 여부를 자동 분류**하는 AI 모델을 개발하는 것을 목적으로 한다.

<br>

### 프로젝트 소개

본 프로젝트는 두 단계로 구성된다.

**1단계 — 머신러닝 기반 No-Show 예측**  
Kaggle Medical No-Show Dataset(`KaggleV2-May-2016.csv`)을 기반으로,  
단일 플랫 파일을 정규화된 다중 테이블 구조(Neighbourhood / Patients / Appointment / Calendar / Weather)로 전처리하였다.  
시간 순 기반 분할(70:15:15)을 적용하고 Logistic Regression, LightGBM, XGBoost, CatBoost 4가지 모델을 비교 평가하였다. </br>
-> **최종 선정 모델 : CatBoost**

<br>

**2단계 — 딥러닝 기반 응급 분류 모델**  
환자의 주증상 텍스트(Chief Complaint)와 나이·성별 수치 데이터를 융합한 **BERT 기반 멀티모달 모델**을 개발하였다.  
텍스트는 BERT로 임베딩을 추출하고, 수치 데이터는 MLP로 특징을 추출한 뒤 두 벡터를 concat하여  
응급(KTAS 1\~3) / 비응급(KTAS 4~5)을 분류한다.

<br>

### 기대효과

- 병원 운영 효율화 : No-Show 예측을 통해 대기 환자 배치 및 예약 슬롯 관리 최적화
- 의료 자원 절감 : 불필요한 예약 공백 감소로 진료 공백 최소화
- 응급 환자 신속 분류 : 증상 텍스트 기반 자동 응급 분류로 초기 트리아지(Triage) 보조 가능

> **Triage** : 응급상황 시 치료의 우선순위를 정하기 위한 환자 분류 체계

<br>

### 대상 사용자

- 병원 예약 관리 담당자 (No-Show 예측 활용)
- 응급실 담당 의료진 (응급 분류 모델 활용)

</br>

# 4. 기술 스택

# 5. 수행결과

# 6. 한 줄 회고
