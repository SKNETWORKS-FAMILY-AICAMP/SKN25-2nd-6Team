# 🏥 의료 예약 데이터 전처리 결과보고서

**데이터셋**: Kaggle Medical No-Show Dataset (KaggleV2-May-2016.csv)  
**목적**: Raw 데이터의 정규화 및 분석 가능한 다중 테이블 구조로 변환

---

## 📋 목차

1. [개요](#개요)
2. [데이터 정제](#데이터-정제)
3. [테이블 설계 원칙](#테이블-설계-원칙)
4. [테이블 분할 결과](#테이블-분할-결과)
5. [파생 변수 생성](#파생-변수-생성)
6. [데이터 누수 방지 전략](#데이터-누수-방지-전략)
7. [정규화 설계 변천](#정규화-설계-변천)
8. [출력 파일](#출력-파일)

---

## 📌 개요

본 전처리 과정은 단일 플랫 파일(Raw CSV)을 정규화된 관계형 다중 테이블 구조로 변환하는 것을 핵심 목표로 한다. 단순한 컬럼 가공에 그치지 않고, 향후 머신러닝 파이프라인에서 발생할 수 있는 데이터 누수(Data Leakage)를 사전에 차단하는 구조 설계에 중점을 두었다.

```
Raw CSV (단일 파일)
        │
        ▼
데이터 정제 (이상값 제거 / 타입 변환)
        │
        ▼
정규화 분할 (1NF → 3NF)
        │
   ┌────┼────┐
   ▼    ▼    ▼
Neighbourhood  Patients  Appointment
```

---

## 🧹 데이터 정제

### 이상 레코드 제거

원본 데이터에 포함된 오염 데이터를 두 가지 기준으로 식별하여 제거하였다.

첫째, `Age` 값이 음수로 기록된 레코드는 현실적으로 존재할 수 없는 값이므로 해당 행을 삭제하였다. 이 기준에 해당하는 예약 ID는 `5642903`, `5642503`, `5642549`, `5642828`, `5642494`이다. 음수 나이는 데이터 수집 또는 입력 과정의 오류로 판단되며, 대체값을 추정하기 어렵기 때문에 삭제 처리가 적절하다.
마찬가지로 지역명이 `PARQUE INDUSTRIAL`로 기록된 레코드도 음수 `Age`값이 기록되어 삭제하였다.

| 제거 유형 | 대상 | 처리 방식 |
|-----------|------|-----------|
| 음수 Age 레코드 | `5642903`, `5642503`, `5642549`, `5642828`, `5642494` | 행 삭제 |
| 음수 Age 레코드 | `PARQUE INDUSTRIAL` | 행 삭제 |

### 데이터 타입 변환

```python
df['ScheduledDay'] = pd.to_datetime(df['ScheduledDay'])
df['AppointmentDay'] = pd.to_datetime(df['AppointmentDay'])
```

날짜 컬럼을 `datetime` 형식으로 파싱하여 이후 파생 변수 계산의 정확도를 보장한다. 문자열 상태로 두면 날짜 간 차이 계산(`lead_time_days`)이 불가능하거나 오류가 발생할 수 있다.

---

## 🏗️ 테이블 설계 원칙

원본 데이터는 환자 정보, 예약 정보, 지역 정보가 모두 한 행에 혼재된 비정규화 구조였다. 이를 아래의 원칙에 따라 분리하였다.

- **Neighbourhood 테이블**: 지역(Neighbourhood)에 대한 정보만 보유
- **Patients 테이블**: 환자(Patient) 개인에 대한 정보만 보유
- **Appointment 테이블**: 개별 예약 이벤트에 대한 정보만 보유
- **Calendar 테이블** *(별도 구성)*: 날짜 차원 정보 (요일, 공휴일 등)

각 테이블은 FK(Foreign Key)로 연결되어 참조 무결성을 유지한다. 하나의 테이블이 단일 주제만 담당하도록 설계함으로써, 특정 테이블의 데이터 변경이 다른 테이블에 불필요한 영향을 미치지 않도록 하였다.

---

## 📊 테이블 분할 결과

전체 테이블 간 관계 및 FK 연결 구조는 첨부된 ERD를 참고한다.

### Neighbourhood 테이블

지역별 집계 통계를 포함하는 차원 테이블로, 원본의 `Neighbourhood` 문자열 컬럼을 정수 ID로 매핑하여 Appointment 테이블에서 FK로 참조한다.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `nhood_id` | INT (PK) | 지역 고유 식별자 (자동 부여) |
| `nhood_name` | VARCHAR | 지역명 |
| `total_appts` | INT | 해당 지역 누적 총 예약 건수 |
| `noshow_rate` | FLOAT | 지역 평균 노쇼 비율 |
| `avg_lead_time` | FLOAT | 지역 평균 대기 일수 |

### Patients 테이블

환자 단위의 고유 정보를 보유하는 차원 테이블이다. 동일 환자의 여러 예약 레코드를 `groupby`로 집계하여 1환자 1행 구조로 변환하였다. 원본 데이터의 오타 컬럼명(`Hipertension`, `Handcap`)은 의미 있는 이름(`has_hypertension`, `has_handicap`)으로 정제하였다.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `patient_id` | BIGINT (PK) | 환자 고유 식별자 |
| `gender` | CHAR | 성별 (M=남성, F=여성) |
| `age` | TINYINT | 환자 나이 |
| `has_hypertension` | TINYINT | 고혈압 여부 (0=없음, 1=있음) |
| `has_diabetes` | TINYINT | 당뇨 여부 (0=없음, 1=있음) |
| `has_alcoholism` | TINYINT | 알코올 중독 여부 (0=없음, 1=있음) |
| `has_handicap` | TINYINT | 장애 여부 (0=없음, 1=있음) |
| `scholarship` | TINYINT | 정부 복지 지원금 수급 여부 (0=미수급, 1=수급) |
| `noshow_cnt` | INT | 노쇼 누적 횟수 |
| `noshow_rate` | FLOAT | 노쇼 비율 |
| `first_visit_date` | DATE | 최초 방문 일자 |
| `last_visit_date` | DATE | 최근 방문 일자 |

### Appointment 테이블

개별 예약 이벤트를 기록하는 팩트 테이블이다. 각 행은 하나의 예약 건을 나타내며, 환자 및 지역 정보는 FK로 참조한다.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `appt_id` | BIGINT (PK) | 예약 고유 식별자 |
| `patient_id` | BIGINT (FK) | 환자 고유 식별자 |
| `nhood_id` | INT (FK) | 지역 고유 식별자 |
| `appt_date` | DATE (FK) | 진료 예정 날짜 |
| `scheduled_at` | DATE | 예약 접수 날짜 |
| `scheduled_time` | TIME | 예약 접수 시각 |
| `is_noshow` | TINYINT | 노쇼 발생 여부 (0=노쇼, 1=정상 방문) |
| `sms_received` | TINYINT | 사전 문자 수신 여부 (0=미수신, 1=수신) |
| `lead_time_days` | INT | 예약일~진료일 대기 일수 |

### Calendar 테이블

날짜 차원 정보를 분리하여 관리하는 테이블이다. 기상 정보는 정규화 원칙에 따라 별도 Weather 테이블로 분리하였다(설계 변천 참고). 공휴일은 `holidays` 라이브러리를 통해 브라질 에스피리투산투(ES) 주 기준으로 판정하였으며, 공휴일 전후일 컬럼은 `is_holiday`를 shift하여 파생하였다.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `date` | DATE (PK) | 기준 일자 |
| `dow` | TINYINT | 요일 (0=월요일, 6=일요일) |
| `month` | TINYINT | 월 |
| `is_weekend` | TINYINT | 주말 여부 (0=평일, 1=주말 / dow ≥ 5) |
| `is_holiday` | TINYINT | 공휴일 여부 (0=평일, 1=공휴일 / 브라질 ES 기준) |
| `is_before_holiday` | TINYINT | 공휴일 직전일 여부 (0=해당없음, 1=해당) |
| `is_after_holiday` | TINYINT | 공휴일 직후일 여부 (0=해당없음, 1=해당) |

### Weather 테이블

기상 데이터는 Open-Meteo Historical Weather API로부터 수집하였다. 수집 기간은 Appointment 테이블의 `appt_date` 최솟값~최댓값으로 자동 결정되며, 브라질 비토리아(Vitória, ES) 좌표(위도 -20.3155, 경도 -40.3128)를 기준으로 한다. WMO 기상 코드는 가독성을 위해 텍스트 설명(`weather_desc`)으로 변환하였다.

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| `date` | DATE (FK → Calendar) | 기준 일자 |
| `max_temp` | FLOAT | 일 최고 기온 (°C) |
| `min_temp` | FLOAT | 일 최저 기온 (°C) |
| `temp_range` | FLOAT | 일교차 (max_temp − min_temp) |
| `precip_mm` | FLOAT | 일 강수량 (mm) |
| `is_rainy` | TINYINT | 강수 여부 (0=강수없음, 1=강수 / precip_mm > 0) |
| `weather` | INT | WMO 기상 코드 |
| `weather_desc` | VARCHAR | WMO 코드 텍스트 설명 |

---

## 🔧 파생 변수 생성

원본 데이터에 없던 의미 있는 변수를 계산하여 추가하였다.

```python
# 예약 접수 시각 추출
df['scheduled_time'] = df['ScheduledDay'].dt.strftime('%H:%M')

# 예약 접수일 ~ 진료 예정일 대기 일수
df['lead_time_days'] = (df['appt_date'] - df['scheduled_date']).apply(lambda x: x.days)

# 노쇼 여부 이진 인코딩 (Yes=0, No=1)
df['is_noshow'] = df['No-show'].map({'Yes': 0, 'No': 1})
```

| 파생 변수 | 계산 방법 | 의미 |
|-----------|-----------|------|
| `scheduled_time` | `ScheduledDay`에서 시각 추출 | 예약 접수 시각 |
| `lead_time_days` | `appt_date - scheduled_date` | 예약~진료 대기 일수 |
| `is_noshow` | `No-show` 역방향 매핑 (Yes→0, No→1) | 노쇼=0, 정상 방문=1 |

---

## ⚠️ 데이터 누수 방지 전략

`noshow_rate`, `noshow_cnt`, `avg_lead_time` 등의 집계 통계 변수는 전체 데이터를 기반으로 계산되므로, 이를 테이블에 그대로 포함하면 미래 정보가 현재 예측에 개입되는 Data Leakage가 발생한다.

### 문제 시나리오

```
Train/Test Split 이전에 전체 데이터로 noshow_rate를 계산
        │
        ▼
Test 데이터의 미래 노쇼 정보가 Train 시점의 통계에 이미 반영됨
        │
        ▼
모델이 실제보다 과도하게 좋은 성능을 보임 (Overfitting)
```

### 대응 방법

현재 테이블에 저장된 집계값은 EDA 및 탐색 목적으로만 활용하며, 모델 학습 시에는 Train 데이터 기반으로 재가공하여 사용한다.

| 변수 | 현재 테이블 포함 여부 | 실제 모델 활용 방법 |
|------|-----------------------|---------------------|
| `noshow_rate` (환자별) | 포함 (참조용) | Train/Test Split 후 Train 데이터만으로 재계산 |
| `noshow_cnt` | 포함 (참조용) | 동일 |
| `avg_lead_time` (지역별) | 포함 (참조용) | Train 데이터만으로 재집계 |

---

## 🔄 정규화 설계 변천

### Calendar와 Weather 테이블 분리

초기 설계에서는 기상 정보(기온, 강수량, 기상 상태)를 Calendar 테이블 내에 포함하려 했다. 그러나 제3정규형(3NF) 원칙에 따라 날짜 속성과 기상 속성은 서로 다른 주제를 다루므로 분리를 결정하였다.

```
[변경 전]
Calendar: date, dow, month, is_weekend, is_holiday,
          max_temp, min_temp, precip_mm, weather_code

[변경 후]
Calendar: date, dow, month, is_weekend, is_holiday,
          is_before_holiday, is_after_holiday
Weather:  date(FK), max_temp, min_temp, temp_range,
          precip_mm, is_rainy, weather, weather_desc
```

| 판단 근거 | 내용 |
|-----------|------|
| 주제 단일성 | Calendar는 날짜 속성, Weather는 기상 속성으로 별도 개체 |
| 확장성 | 기상 데이터 소스 변경 시 Calendar에 영향 없이 독립 관리 가능 |
| 재사용성 | 기상 테이블을 다른 분석에서도 독립적으로 활용 가능 |

---

## 📁 출력 파일

```
output/
├── Neighbourhood.csv   # 지역 차원 테이블
├── Patients.csv        # 환자 차원 테이블
├── Appointment.csv     # 예약 팩트 테이블
├── Calendar.csv        # 날짜 차원 테이블
└── Weather.csv         # 기상 데이터 테이블
```

### 실행 방법

```bash
# 메인 전처리 (Neighbourhood, Patients, Appointment 생성)
python data_preprocessor.py

# Calendar 및 Weather 생성 (인터넷 연결 필요)
python data_calendar_weather.py
```

`data_preprocessor.py` 실행 시 `KaggleV2-May-2016.csv`가 스크립트 내 지정된 경로에 존재해야 한다.
`data_calendar_weather.py` 실행 시 `Appointment.csv`가 스크립트 내 지정된 경로에 존재해야 한다.

---

## 📎 데이터 일관성 검사

환자별 `Handcap` 값의 변화 여부를 자동 검사한다. 동일 환자가 방문 시점에 따라 다른 값을 가지는 경우를 탐지하여 데이터 품질을 확인한다.

```python
p_handcap_check = df.groupby('PatientId')['Handcap'].nunique()
inconsistent = p_handcap_check[p_handcap_check > 1]
```

---

*본 보고서는 데이터 전처리 코드(`data_preprocessor.py`, `data_calendar_weather.py`) 및 ERD 설계를 기반으로 작성하였다.*
