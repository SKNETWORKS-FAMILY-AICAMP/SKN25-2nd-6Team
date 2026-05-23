# MediPaw (동물병원 AI 예약 & EMR 자동화 시스템)

본 프로젝트는 보호자용 웹 앱(`guardian-web`), 수의사용 웹 앱(`vet-web`), AI 에이전트 파이프라인 및 백엔드 API 서버의 유기적인 연동을 통해 수의 진료 예약 프로세스와 전자의무기록(EMR) 작성을 자동화하는 통합 솔루션입니다.

---

## 1. 시스템 아키텍처 및 흐름

전체 연동 흐름은 다음과 같은 시퀀스로 구성됩니다:

```mermaid
sequenceDiagram
    autonumber
    actor Guardian as 보호자 (guardian-web)
    participant Backend as 백엔드 서버 (FastAPI)
    participant DB as 데이터베이스 (PostgreSQL)
    participant AI as AI Agents (Triage/Schedule/Chart/Validation/Follow-up)
    actor Vet as 수의사 (vet-web)

    %% Shared Context Loading
    Guardian->>Backend: 1. 문진 챗 세션 시작 & 증상 입력
    Backend->>DB: EMR 과거 이력 조회 (재진 판단 및 병력)
    DB-->>Backend: 과거 EMR & 처방 데이터 반환
    Backend->>Backend: 2. Shared Patient Context 빌드

    %% Triage Phase
    Backend->>AI: 3. Triage Agent 실행 (Shared Context 제공)
    AI-->>Backend: Triage 판단 완료 (is_triage_complete=true)
    Backend->>DB: Triage 결과 저장 (triage_resultDB)

    %% Scheduling Phase
    Backend->>AI: 4. Schedule Agent 실행 (Triage + Shared Context 제공)
    AI-->>Backend: 최적 진료 시간 & 슬롯 윈도우 계산
    Backend-->>Guardian: 5. 예약 가능 슬롯 목록 제안 (의료 판단 노출 X)

    %% Booking & Post-Booking Phase
    Guardian->>Backend: 6. 예약 시간 선택 (POST /schedules/confirm)
    Backend->>DB: 예약 확정 (scheduleDB) & 수의사 알람 생성
    Backend->>AI: 7. 백그라운드 파이프라인 트리거 (Chart & Validation Agent 병렬 실행)
    
    par Chart Agent
        AI->>AI: Shared Context 기반 SOAP 차트 초안 생성
        AI->>DB: 차트 초안 저장 (reportDB) & 알람 생성
    and Validation Agent
        AI->>AI: Triage-SOAP 정합성 검증 (completeness/accuracy/consistency)
        AI->>AI: EMR Alignment / Prescription Safety 검증
        AI->>DB: 검증 점수 및 요약 저장 (validation_resultDB)
    end

    %% Follow-up Escalation Phase (Synchronous)
    Guardian->>Backend: 8. 경과 모니터링 사진/메시지 전송 (POST /followup)
    Backend->>AI: 9. Follow-up Agent 실행 (Shared Context + 누적 경과 제공)
    AI-->>Backend: 모니터링 응답 & 액션 추천 (followup_recommended, actions)
    Backend-->>Guardian: 10. 동기화된 모니터링 응답 렌더링 (전화 연결 / 기존 예약 유지 안내)
    Backend->>DB: 누적 임상 경과 요약 저장 (ai_summary)

    %% Vet Dashboard Phase
    Vet->>Backend: 11. 수의사 로그인 & 대시보드 로드
    Backend->>DB: EMR 대기큐 및 알람 리스트 조회
    DB-->>Backend: 데이터 반환
    Backend-->>Vet: 오늘의 대기 환자, AI 차트 초안, 정합성 검증 점수 시각화
```

### 1.1 핵심 아키텍처 및 운영 정책 가이드라인

본 시스템의 견고성과 신뢰성을 위해 설계된 5가지 핵심 아키텍처 및 운영 정책 가이드라인입니다.

#### 1) Agent Execution Ownership (에이전트 실행 권한 및 주체)
* **Triage Agent**: 보호자가 제공한 증상을 바탕으로 즉각적인 임상 위험도를 평가하며, 세션과 연동된 백엔드 오케스트레이터의 소유 하에 실행됩니다.
* **Schedule Agent**: 수의사 진료 자원과 임상 긴급도(VTL Level)를 매칭하여 최적 슬롯 윈도우를 계산합니다.
* **Chart & Validation Agents**: 예약 확정 시 백그라운드에서 백엔드 오케스트레이터(`_run_post_booking_agents`)에 의해 실행되는 비동기 분석 전문 에이전트입니다.
* **Follow-up Agent**: 퇴원/귀가 후 보호자가 전달하는 환자 경과를 수신하고 평가하여 동기식으로 긴급도 상태 피드백을 제공합니다.

#### 2) Sync vs Async Boundary (동기 및 비동기 파이프라인 경계)
* **Sync Boundary (동기 처리 범위)**:
  - 보호자의 실시간 문진 세션, 예약 확정(`POST /schedules/confirm`) 트랜잭션 처리, 그리고 `POST /followup` 응답은 모두 **동기(Synchronous)** 범위에서 빠르게 응답을 보장해야 합니다.
  - 특히 경과 관찰(`followup`) 분석은 보호자의 메시지 전달 후 즉각적인 대답이 필요하므로 동기 호출로 수행되며, 최대 10초 타임아웃 세이프가드가 적용되어 있습니다.
* **Async Boundary (비동기 처리 범위)**:
  - 예약 확정 후 이루어지는 SOAP AI 차트 초안 작성(`chart` agent) 및 문진-예약 정합성 검증(`validation` agent)은 시간이 다소 소요되므로 백그라운드 태스크(`asyncio.create_task`)로 격리되어 비동기로 실행됩니다.

#### 3) DB Write Timing (데이터베이스 저장 및 커밋 타이밍)
* **예약 확정 단계**:
  - `POST /schedules/confirm` 시 예약 내역 생성 및 타임슬롯 선점(임시 락 및 DB 예약 레코드 삽입)은 **동일 트랜잭션 범위(Atomic)** 내에서 즉시 커밋되어 완벽한 원자성을 보장합니다.
  - 알람 생성 및 백그라운드 AI 에이전트 트리거는 비핵심 영역(Non-Critical Path)으로 분리하여, AI 작업이 실패하더라도 이미 생성된 예약이 롤백되지 않고 분리되어 저장됩니다.
* **정합성 및 차트 적재 단계**:
  - 백그라운드 에이전트 실행 완료 직후, 각 결과(`reportDB`, `validation_resultDB`)에 대해 개별 커밋이 수행되어 데이터가 분할 적재됩니다.

#### 4) Failure Recovery Strategy (장애 복구 및 Fallback 전략)
* **비동기 태스크 격리 (Task Isolation)**:
  - Chart Agent 또는 Validation Agent가 예외를 발생시키거나 데이터베이스 저장 과정에서 실패하더라도 다른 에이전트의 수행 및 예약의 유효성에 영향을 끼치지 않도록 개별 `try/except` 블록으로 예외 전파를 차단합니다.
* **동기식 10초 타임아웃 (Timeout Safeguard)**:
  - Follow-up 분석 호출 시 10초 타임아웃이 초과되면 `asyncio.TimeoutError`를 캐치하여 디폴트 안전 응답(기존 예약 유지 권장, 응급 수준 하향 상태 및 분석 지연 안내 메시지)을 반환하고 데이터베이스에는 분석 대기 요약을 기록하는 Graceful Fallback 전략을 구현하고 있습니다.

#### 5) Soft-guided UX Separation Policy (임상 위험 판단과 UX 분리 및 금기어 관리)
* **임상 긴급 신호(VTL Basis, Emergency Alert)**:
  - 시스템 내부적으로는 과거 병력과 약물 중복 위험, 현재 긴급 상태를 판단하여 데이터베이스(`emergency_alert=True`, `checks` 등)와 수의사 대시보드에 정확한 임상적 시그널을 적재합니다.
* **보호자 가이드라인 분리 (Forbidden Alarming Words)**:
  - 보호자 화면(Guardian-facing UI/Chat)으로 노출되는 메시지 가이드에서는 공포심이나 혼란을 예방하기 위해 극단적인 위협 단어(예: **"응급"**, **"위험"**, **"즉시 내원"**, **"치명적"**)의 직접적인 사용을 필터링(Soft-guided UX)하고, 행동 지침 중심의 정제된 용어(예: "진료 일정을 유지해주세요", "병원 전화 연결")로 변환하여 노출합니다.

---

## 2. 사용 포트 정보

로컬 개발 환경에서는 아래 포트들을 사용해 서비스가 기동됩니다.

| 구성 요소 | 기술 스택 | 로컬 주소 및 포트 | 비고 |
| :--- | :--- | :--- | :--- |
| **백엔드 서버** | FastAPI, SQLAlchemy | `http://localhost:8000` | REST API 및 AI 에이전트 엔드포인트 제공 |
| **보호자용 웹** | React (Vite), TailwindCSS | `http://localhost:5173` | AI 챗봇 상담 및 예약 접수 |
| **수의사용 웹** | React (Vite), TailwindCSS | `http://localhost:5174` | EMR 대기큐 관리, AI 차트 검토 |
| **데이터베이스** | PostgreSQL | `localhost:5432` | DB명: `medipaw` |

---

## 3. 환경 설정 (.env)

백엔드 서버 구동을 위해 `backend/.env` 파일에 아래와 같이 올바른 정보가 기동되어 있어야 합니다:

```env
DATABASE_URL=postgresql+asyncpg://medipaw:medipaw123@localhost:5432/medipaw
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=14

# OpenAI API설정
OPENAI_API_KEY=sk-proj-...  # 발급받은 실제 OpenAI API Key 입력
OPENAI_MODEL=gpt-4o-mini

# AWS S3 (로컬 저장소 폴더 사용 시 기본값 유지)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=medipaw-storage
CLOUDFRONT_URL=

# CORS 설정 (프론트엔드 연동 주소)
DEBUG=true
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

---

## 4. 서버 및 앱 실행 순서

### Step 1. 로컬 데이터베이스 기동 및 스키마 점검
로컬 PostgreSQL을 켜고 DB명 `medipaw`가 생성되어 있는지 확인합니다. 마이그레이션 및 누락된 테이블/컬럼 패치는 백엔드 초기 구동 과정에서 완료됩니다.

### Step 2. 백엔드 가상환경 설정 및 서버 실행
프로젝트 루트에서 백엔드 폴더로 이동한 후 가상환경을 활성화하고 서버를 켭니다. **(AI 모듈을 올바르게 임포트하기 위해 루트 폴더를 `PYTHONPATH`에 추가해야 합니다.)**

```bash
# 1. 백엔드 디렉토리 이동
cd backend

# 2. PYTHONPATH 설정과 함께 Uvicorn 서버 실행
PYTHONPATH=/Users/chanyoung/Desktop/medipaw_integrate uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3. 테스트 계정 및 과거 EMR 시드 데이터 주입
백엔드 구동 후 다른 터미널에서 계정 및 테스트 데이터를 데이터베이스에 주입합니다.

```bash
cd backend
# 테스트용 보호자/수의사 계정 생성 및 비밀번호 갱신
DATABASE_URL=postgresql://medipaw:medipaw123@localhost:5432/medipaw python scripts/create_test_accounts.py

# 보호자 테스트 반려동물(뽀미)에 대한 과거 EMR 병력 mock 데이터 생성
DATABASE_URL=postgresql://medipaw:medipaw123@localhost:5432/medipaw python scripts/seed_mock_emr.py
```

### Step 4. 프론트엔드 웹 앱 기동
보호자용 웹과 수의사용 웹을 각각 다른 터미널에서 기동합니다.

```bash
# 보호자용 웹 실행
cd frontend/guardian-web
npm install
npm run dev

# 수의사용 웹 실행
cd frontend/vet-web
npm install
npm run dev
```

---

## 5. 테스트 계정 정보

로그인 및 서비스 테스트를 위해 아래 생성된 기본 계정들을 활용하십시오:

### 1) 보호자용 (http://localhost:5173)
* **아이디:** `guardian_test`
* **비밀번호:** `Test1234!`
* **등록 반려동물:** 뽀미 (말티즈, 5세, 3.2kg, 과거 피부염 및 위장관 질환 병력 존재)

### 2) 수의사용 (http://localhost:5174)
* **아이디:** `vet_test`
* **비밀번호:** `Test1234!`
* **병원명:** MediPaw 동물병원 (담당 수의사: 테스트수의사)
---

## 7. Chatbot Reservation Orchestration Flow

챗봇 예약 오케스트레이션 전체 흐름:

```mermaid
sequenceDiagram
    autonumber
    actor G as 보호자 (guardian-web)
    participant Chat as 챗봇 (Triage SSE)
    participant Backend as Backend (FastAPI)
    participant SchedAgent as Schedule Agent
    participant DB as PostgreSQL

    G->>Chat: 새 상담 세션 시작
    Chat-->>G: "어떤 증상 때문에 예약을 원하시나요?" + symptom pills
    G->>Chat: 증상 입력 (예: "구토")
    Chat->>Backend: POST /chat/sessions/{id}/messages (SSE)
    Backend->>Backend: Triage Agent 실행
    Backend-->>Chat: triage_complete 이벤트 (emrid 포함)
    Chat->>Backend: POST /api/agent/run (agent_type=schedule)
    Backend-->>Chat: {task_id}
    Chat->>Backend: GET /api/agent/sse/{task_id}
    Backend->>SchedAgent: schedule agent 실행
    SchedAgent-->>Backend: {slot_window, estimated_duration_min}
    Backend-->>Chat: SSE done (slot_window 결과)
    Chat->>Backend: GET /schedules/available?date=...&duration_min=...
    Backend-->>Chat: 가용 슬롯 목록 (start_time, doctorid)
    Chat-->>G: 슬롯 3개 카드 렌더링 + quick reply pills
    G->>Chat: 슬롯 선택 클릭
    Chat->>Backend: POST /schedules/confirm {emrid, doctorid, confirmed_time, duration_min}
    Backend->>DB: scheduleDB 생성 (status=CONFIRMED)
    Backend->>Backend: asyncio.create_task(Chart+Validation+Judge)
    Backend-->>Chat: {code:201, schedule_id, confirmed_time}
    Chat-->>G: "예약 완료! 📅 MM월 DD일 HH:MM"
    Note over Chat,G: need_followup=true 이면 FOLLOWUP_ACTIVE 전환
```

---

## 8. chatPhase State Machine

guardian-web 챗봇의 UI 상태 머신 (pipeline.phase → chatPhase 매핑):

```mermaid
stateDiagram-v2
    [*] --> IDLE : 세션 없음

    IDLE --> SYMPTOM_COLLECTING : 새 세션 생성\n(초기 메시지 + symptom pills 자동 출력)

    SYMPTOM_COLLECTING --> TRIAGE_RUNNING : 증상 입력 전송\n(Triage Agent SSE 시작)

    TRIAGE_RUNNING --> SLOT_RECOMMENDING : triage_complete 이벤트\n(Schedule Agent 실행 + 슬롯 조회)

    SLOT_RECOMMENDING --> BOOKING_CONFIRMED : 슬롯 선택\n(POST /schedules/confirm 성공)
    SLOT_RECOMMENDING --> SLOT_RECOMMENDING : 슬롯 선택 실패\n(슬롯 pills 재노출)

    BOOKING_CONFIRMED --> FOLLOWUP_ACTIVE : need_followup=true\n(경과 모니터링 활성화)
    BOOKING_CONFIRMED --> [*] : need_followup=false\n(상담 완료)

    FOLLOWUP_ACTIVE --> FOLLOWUP_ACTIVE : 경과 메시지 전송\n(POST /followup + AI 분석)
    FOLLOWUP_ACTIVE --> [*] : 예약 시간 도달 또는\n진료 완료 처리

    note right of SLOT_RECOMMENDING
        일반 텍스트 입력 비활성화
        슬롯 pill 버튼만 활성
    end note

    note right of BOOKING_CONFIRMED
        모든 채팅 입력 잠금
        새 상담 시작 안내 표시
    end note
```

---

## 9. Follow-up Lifecycle

```mermaid
flowchart TD
    A[예약 확정\nBOOKING_CONFIRMED] --> B{need_followup?}
    B -- false --> C[상담 종료\n입력 잠금]
    B -- true --> D[FOLLOWUP_ACTIVE\n경과 모니터링]

    D --> E[보호자 경과 메시지 입력\nPOST /followup]
    E --> F[Followup Agent 실행\n10s timeout]
    F --> G{followup_recommended?}

    G -- false --> H[기록 완료 메시지\n"경과가 기록되었어요"]
    G -- true --> I[에스컬레이션 배너 표시\n병원 전화 / 빠른 예약 추천]

    H --> D
    I --> D

    D --> J{종료 조건}
    J -- 예약 시간 도달 --> C
    J -- 진료 완료 처리\nstatus=COMPLETED --> C

    style D fill:#dbeafe,stroke:#3b82f6
    style I fill:#fef3c7,stroke:#f59e0b
    style C fill:#dcfce7,stroke:#16a34a

    subgraph 이미지 업로드 정책
        K[최대 3장 / 1회 업로드\n5MB 이하 JPG/PNG]
    end

    subgraph follow-up 활성 조건
        L[피부 질환 / 수술 후\n만성질환 / 약물 반응 추적\nneed_followup=true]
    end
```
