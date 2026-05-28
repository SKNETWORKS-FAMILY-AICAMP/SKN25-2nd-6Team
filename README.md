![MediPaw Logo](frontend/shared/assets/logo/medipaw-symbol.png)

> # **"반려동물의 골든타임, AI가 먼저 읽어냅니다."**
>
> 소형 동물병원의 진료 공백과 업무 과부하를 줄이는  
> **AI 기반 응급도 분류 및 동물병원 업무 자동화 플랫폼**

---

## **1. 팀원 소개**

<table style="background-color: #fafafa; border-radius: 8px;">
  <tr>
    <td align="center" style="color: #4A90E2;"><b>Frontend</b></td>
    <td align="center" style="color: #4A90E2;"><b>Frontend</b></td>
    <td align="center" style="color: #F5A623;"><b>Backend / DB</b></td>
    <td align="center" style="color: #F5A623;"><b>Backend / DB</b></td>
    <td align="center" style="color: #7F8C8D;"><b>AI Agent</b></td>
  </tr>
  <tr>
    <td align="center"><b>김지현</b></td>
    <td align="center"><b>박지현</b></td>
    <td align="center"><b>조민서</b></td>
    <td align="center"><b>이채림</b></td>
    <td align="center"><b>김찬영</b></td>
  </tr>
  <tr>
    <td align="center">보호자/수의사 UI 구현</td>
    <td align="center">보호자/수의사 UI 구현</td>
    <td align="center">API / DB 설계</td>
    <td align="center">API / DB 설계</td>
    <td align="center">Multi-Agent 설계</td>
  </tr>
</table>

---

## **2. 개발 배경**

### **소형 동물병원의 구조적 한계와 골든타임 문제**

국내 반려동물 의료 시장은 빠르게 성장하고 있지만, 많은 중소형 동물병원은 여전히 1인 원장 또는 소규모 인력 중심으로 운영되고 있습니다.

수의사는 진료와 수술뿐 아니라 예약 관리, 전화 응대, 보호자 상담, 차트 작성까지 동시에 처리해야 합니다.  
이 과정에서 응급 환자의 연락이 지연되거나, 진료 중 부재중 전화가 누락되면 신규 환자 이탈뿐 아니라 반려동물의 **골든타임 손실**로 이어질 수 있습니다.

### **보호자 관찰 데이터의 단절**

반려동물은 자신의 증상을 직접 설명할 수 없기 때문에 보호자의 관찰 기록과 사진, 영상 자료가 매우 중요합니다.  
하지만 실제 진료 현장에서는 이러한 자료가 병원 시스템에 체계적으로 누적되지 못하고, 보호자가 매 진료마다 다시 찾아 전달해야 하는 불편이 발생합니다.

이는 진료 연속성을 떨어뜨리고, 수의사가 환자의 상태 변화를 정확히 파악하는 데 어려움을 만듭니다.

### **반복적인 차팅 업무와 의료진 번아웃**

수의사는 진료 이후 SOAP 형식의 의무기록을 직접 작성해야 합니다.  
문진 내용 정리, 증상 요약, 보호자 설명 기록, 치료 계획 작성은 많은 시간을 소모하며 의료진의 피로도를 높입니다.

MediPaw는 보호자 문진, 이미지 업로드, 응급도 판단, 예약 관리, EMR 초안 생성을 하나의 흐름으로 연결해  
수의사가 더 중요한 진료 판단에 집중할 수 있도록 돕고자 합니다.

---

## **3. 서비스 소개**

MediPaw는 보호자 웹과 수의사 웹을 분리하여 각 사용자의 업무 흐름에 맞춘 기능을 제공합니다.

### **Guardian Web**

보호자는 반려동물 정보를 등록하고, AI 챗봇 문진을 통해 증상을 입력할 수 있습니다.  
필요한 경우 증상 이미지를 업로드하고, 진료 예약을 신청하거나 기존 예약을 확인할 수 있습니다.

주요 기능은 다음과 같습니다.

- 보호자 회원가입 / 로그인
- 반려동물 등록 및 관리
- AI 챗봇 기반 문진 작성
- 증상 이미지 업로드
- 진료 예약 신청
- 예약 확인, 변경, 취소
- 진료 후 Follow-up 기록 업로드

### **Veterinarian Web**

수의사는 병원 대시보드에서 예약 현황과 환자 정보를 확인할 수 있습니다.  
보호자가 작성한 문진과 이미지 정보를 바탕으로 환자의 상태를 빠르게 파악하고, EMR 작성 화면에서 진료 기록을 관리할 수 있습니다.

주요 기능은 다음과 같습니다.

- 수의사 로그인
- 최초 로그인 시 비밀번호 변경
- 병원 대시보드
- 예약 현황 조회
- 예약 추가, 수정, 삭제
- 환자 목록 및 상세 정보 조회
- EMR 작성 화면
- 병원 설정 관리

---

## **4. 기술 스택**

### **Frontend**

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-43392A?style=for-the-badge&logo=react&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)

### **Backend**

![Python](https://img.shields.io/badge/Python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![FastAPI](https://img.shields.io/badge/FastAPI-00584D?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-CB0000?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![Alembic](https://img.shields.io/badge/Alembic-333333?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

### **AI / Agent**

![OpenAI](https://img.shields.io/badge/OpenAI-0081A5?style=for-the-badge&logo=openai&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)

### **Infrastructure**

![AWS](https://img.shields.io/badge/AWS-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Amazon RDS](https://img.shields.io/badge/Amazon_RDS-527FFF?style=for-the-badge&logo=amazon-rds&logoColor=white)
![Amazon S3](https://img.shields.io/badge/Amazon_S3-569A31?style=for-the-badge&logo=amazon-s3&logoColor=white)
![CloudFront](https://img.shields.io/badge/CloudFront-8C4FFF?style=for-the-badge&logo=amazonaws&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)

---

## **5. 프로젝트 구조**

```text
SKN25-FINAL-1Team/
    ├── ai/                         # AI Agent 및 비동기 작업 구조
    │   ├── agents/                 # Agent 엔트리 포인트
    │   ├── tasks/                  # Celery Task 모듈
    │   └── data/                   # RAG / 원천 데이터 저장 영역
    │
    ├── backend/                    # FastAPI 백엔드
    │   ├── app/
    │   │   ├── api/                # API 라우터
    │   │   ├── core/               # 환경 설정, 보안, 의존성
    │   │   ├── crud/               # DB CRUD 로직
    │   │   ├── db/                 # DB 세션 및 Base
    │   │   ├── models/             # SQLAlchemy ORM 모델
    │   │   ├── schemas/            # Pydantic 요청/응답 스키마
    │   │   └── utils/              # 공통 유틸
    │   ├── migrations/             # Alembic 마이그레이션
    │   ├── alembic.ini
    │   └── requirements.txt
    │
    ├── frontend/
    │   ├── guardian-web/           # 보호자용 React 웹
    │   │   ├── src/
    │   │   │   ├── api/            # 보호자 API 클라이언트
    │   │   │   ├── components/     # 공통/기능 컴포넌트
    │   │   │   ├── hooks/          # 커스텀 훅
    │   │   │   ├── pages/          # 보호자 화면
    │   │   │   ├── routes/         # 라우팅
    │   │   │   └── stores/         # 상태 관리
    │   │   └── package.json
    │   │
    │   ├── vet-web/                # 수의사용 React 웹
    │   │   ├── src/
    │   │   │   ├── api/            # 수의사 API 클라이언트
    │   │   │   ├── components/     # 대시보드/예약/EMR 컴포넌트
    │   │   │   ├── hooks/          # 커스텀 훅
    │   │   │   ├── pages/          # 수의사 화면
    │   │   │   ├── routes/         # 라우팅
    │   │   │   └── stores/         # 상태 관리
    │   │   └── package.json
    │   │
    │   └── shared/                 # 공통 자산 및 shared 리소스
    │
    ├── infra/                      # 인프라 설정
    │   ├── aws/
    │   ├── nginx/
    │   ├── rabbitmq/
    │   └── scripts/
    │
    └── README.md
```

---

## **6. 시스템 아키텍처**

### **6-1. Service Workflow**

```text
Guardian Web
    │
    │ 1. 보호자 로그인 / 반려동물 등록
    │ 2. AI 챗봇 문진 작성
    │ 3. 증상 이미지 업로드
    ▼
FastAPI Backend
    │
    │ 4. 인증 / 예약 / 문진 / 이미지 URL 처리
    │ 5. DB 저장 및 Agent Task 연동
    ▼
PostgreSQL / AWS S3
    │
    │ 6. 사용자, 반려동물, 예약, 문진, 이미지 기록 저장
    ▼
AI Multi-Agent System
    │
    │ 7. 응급도 판단 / 예약 우선순위 / EMR 초안 생성
    ▼
Veterinarian Web
    │
    │ 8. 수의사 대시보드에서 환자 상태 및 예약 확인
    │ 9. EMR 작성 및 Follow-up 관리
```

### **6-2. Multi-Agent Architecture**

MediPaw는 보호자의 문진 데이터와 이미지 분석 결과를 기반으로 수의사의 진료 의사결정을 보조하는 Multi-Agent 구조를 목표로 합니다.

| Agent | 역할 |
| :--- | :--- |
| **Triage Agent** | 보호자 문진과 이미지 분석 결과를 바탕으로 응급도 판단 |
| **Schedule Agent** | 응급도 기반 예약 우선순위 판단 및 가능 시간 탐색 |
| **Chart Agent** | SOAP 형식의 EMR 초안 생성 |
| **Validation Agent** | 응급도, 증상, 이미지 분석 결과 간 논리적 모순 검증 |
| **Judge Agent** | 최종 응답 품질 및 의료 안전성 평가 |
| **Follow-up Agent** | 진료 이후 경과 기록 요약 및 위험 상황 감지 |

> 현재 브랜치에서는 `ai/` 디렉터리 구조가 준비되어 있으며, Agent 세부 구현은 확장 대상입니다.

### **6-3. Backend Architecture**

FastAPI 백엔드는 전체 서비스의 API Gateway 역할을 수행합니다.

- 보호자 인증 API
- 수의사 인증 API
- 반려동물 관리 API
- 예약 관리 API
- AI 문진 채팅 API
- 환자 관리 API
- 대시보드 API
- Follow-up API
- S3 Presigned URL 발급 API

### **6-4. Storage Architecture**

이미지 데이터는 AWS S3와 CloudFront 기반 구조를 목표로 합니다.

- 보호자 증상 이미지
- 경과 관찰 이미지
- 진료 관련 첨부 이미지

Presigned URL 방식을 사용하여 클라이언트가 S3에 직접 업로드할 수 있도록 설계했습니다.  
이를 통해 백엔드 서버 부하를 줄이고 이미지 업로드 속도를 개선할 수 있습니다.

---

## **7. ERD 주요 모델**

MediPaw는 보호자, 수의사, 반려동물, 예약, 문진, EMR, 분석 결과를 하나의 진료 흐름으로 연결합니다.

| 모델 | 설명 |
| :--- | :--- |
| **User** | 공통 사용자 인증 정보 |
| **Guardian** | 보호자 상세 정보 |
| **Doctor** | 수의사 계정 정보 |
| **Hospital** | 병원 정보 |
| **Pet** | 반려동물 프로필 |
| **Schedule** | 보호자 예약 정보 |
| **VetSchedule** | 수의사 진료 가능 일정 |
| **ChatHistory** | AI 문진 대화 기록 |
| **TriageResult** | 응급도 분류 결과 |
| **PhotoAnalysis** | 이미지 분석 결과 |
| **ValidationResult** | Agent 검증 결과 |
| **EMR** | 전자 의무 기록 |
| **Report** | 진료 리포트 |
| **Prescription** | 처방 정보 |
| **Drug** | 약물 데이터 |
| **Followup** | 진료 후 경과 기록 |
| **DoctorAlarm** | 수의사 알림 |

---

## **8. 핵심 기능**

### **1. AI 챗봇 기반 사전 문진**

보호자는 진료 전 AI 챗봇을 통해 반려동물의 증상, 상태 변화, 식욕, 통증 여부 등을 입력할 수 있습니다.

이를 통해 수의사는 진료 전 환자의 상태를 미리 파악할 수 있고, 단순 접수/문진 업무에 드는 시간을 줄일 수 있습니다.

### **2. 증상 이미지 업로드**

보호자는 피부, 눈, 상처 등 증상이 나타난 부위를 이미지로 업로드할 수 있습니다.

이미지는 S3 Presigned URL 구조를 통해 업로드되도록 설계되어 있으며, 추후 이미지 분석 모델과 연결해 응급도 판단에 활용할 수 있습니다.

### **3. 응급도 기반 예약 관리**

보호자의 문진 결과와 이미지 분석 결과를 기반으로 응급도를 판단하고, 수의사 예약 관리 화면에서 우선 확인할 수 있도록 설계했습니다.

이를 통해 병원은 단순 선착순 예약이 아닌, 환자의 위험도에 기반한 진료 우선순위 판단이 가능해집니다.

### **4. 수의사용 대시보드**

수의사는 대시보드에서 당일 예약, 환자 정보, 진료 흐름을 확인할 수 있습니다.

예약 관리 화면에서는 예약 추가, 수정, 취소, 상태 변경을 수행할 수 있습니다.

### **5. 환자 관리 및 EMR**

수의사는 환자 목록과 상세 정보를 조회하고, EMR 화면에서 진료 기록을 작성할 수 있습니다.

MediPaw는 추후 Chart Agent와 연동하여 보호자 문진 기반 SOAP 형식의 EMR 초안을 자동 생성하는 것을 목표로 합니다.

### **6. Follow-up 관리**

진료 이후 보호자가 경과 이미지와 상태 변화를 업로드할 수 있도록 설계했습니다.

Follow-up Agent는 추가 관찰이 필요한 환자에 대해 경과 내용을 요약하고, 위험 상황 발생 시 즉각 내원 안내를 지원하는 역할을 목표로 합니다.

---

## **9. API 명세 요약**

### **Guardian Auth**

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/auth/signup` | 보호자 회원가입 |
| POST | `/auth/login` | 보호자 로그인 |
| POST | `/auth/refresh` | 토큰 재발급 |
| POST | `/auth/logout` | 로그아웃 |
| POST | `/auth/find-id` | 아이디 찾기 |
| POST | `/auth/find-password` | 비밀번호 찾기 |

### **Pet**

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/pets` | 반려동물 목록 조회 |
| POST | `/pets` | 반려동물 등록 |
| GET | `/pets/{pet_id}` | 반려동물 상세 조회 |
| PUT | `/pets/{pet_id}` | 반려동물 정보 수정 |
| DELETE | `/pets/{pet_id}` | 반려동물 삭제 |

### **Chat**

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/chat/sessions` | 채팅 세션 생성 |
| POST | `/chat/sessions/{session_id}/messages` | 채팅 메시지 전송 |
| GET | `/chat/upload/presigned-url` | 이미지 업로드 URL 발급 |
| GET | `/chat/sessions` | 채팅 세션 목록 |
| GET | `/chat/sessions/{session_id}` | 채팅 세션 상세 |
| DELETE | `/chat/sessions/{session_id}` | 채팅 세션 삭제 |

### **Schedule**

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/schedules/checkup` | 검진 예약 신청 |
| GET | `/schedules` | 보호자 예약 목록 |
| GET | `/schedules/available` | 예약 가능 시간 조회 |
| GET | `/schedules/{schedule_id}` | 예약 상세 조회 |
| PATCH | `/schedules/{schedule_id}` | 예약 수정 |
| DELETE | `/schedules/{schedule_id}` | 예약 취소 |
| POST | `/schedules/confirm` | 예약 확정 |

### **Doctor**

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/doctor/auth/login` | 수의사 로그인 |
| PUT | `/doctor/auth/password/change` | 비밀번호 변경 |
| POST | `/doctor/auth/password/reset` | 비밀번호 초기화 |
| GET | `/doctor/reservations` | 병원 예약 목록 |
| POST | `/doctor/reservations` | 예약 등록 |
| PUT | `/doctor/reservations/{schedule_id}` | 예약 수정 |
| PATCH | `/doctor/reservations/{schedule_id}` | 예약 상태 변경 |
| DELETE | `/doctor/reservations/{schedule_id}` | 예약 삭제 |
| GET | `/doctor/patient/list` | 환자 목록 |
| GET | `/doctor/patient/{petid}` | 환자 상세 |
| PUT | `/doctor/patient/{petid}` | 환자 정보 수정 |

---

## **10. 실행 방법**

### **Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

`.env.example`을 참고해 `.env` 파일을 설정합니다.

```env
DATABASE_URL=
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
REFRESH_TOKEN_EXPIRE_DAYS=14

AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=medipaw-bucket
CLOUDFRONT_URL=https://your-cloudfront-url

OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o

RABBITMQ_URL=amqp://guest:guest@localhost:5672/

DEBUG=True
ALLOWED_ORIGINS=http://localhost:3000
```

마이그레이션 실행:

```bash
alembic upgrade head
```

서버 실행:

```bash
uvicorn app.main:app --reload
```

API 문서:

```text
http://localhost:8000/docs
```

### **Guardian Web**

```bash
cd frontend/guardian-web
npm install
npm run dev
```

환경 변수:

```env
VITE_API_BASE_URL=http://localhost:8000
```

기본 실행 주소:

```text
http://localhost:5173
```

### **Vet Web**

```bash
cd frontend/vet-web
npm install
npm run dev
```

환경 변수:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_ENABLE_DEV_LOGIN=false
```

기본 실행 주소:

```text
http://localhost:5174
```

---

## **11. 화면 구성**

### **Guardian Web**

| Route | Description |
| :--- | :--- |
| `/login` | 보호자 로그인 |
| `/signup` | 회원가입 |
| `/find-id` | 아이디 찾기 |
| `/find-password` | 비밀번호 찾기 |
| `/home` | 보호자 홈 |
| `/reservations` | 예약 목록 |
| `/chatbot` | AI 문진 챗봇 |
| `/mypage` | 마이페이지 |
| `/mypage/password` | 비밀번호 변경 |
| `/pets/register` | 반려동물 등록 |
| `/pets/:petId` | 반려동물 수정 |

### **Vet Web**

| Route | Description |
| :--- | :--- |
| `/login` | 수의사 로그인 |
| `/first-password-change` | 최초 비밀번호 변경 |
| `/home` | 대시보드 |
| `/emr` | EMR |
| `/reservation` | 예약 관리 |
| `/patients` | 환자 관리 |
| `/settings` | 병원 설정 |

---

## **12. 기대 효과**

| 대상 | 기대 효과 |
| :--- | :--- |
| **보호자** | 반려동물 증상을 진료 전 체계적으로 전달하고 예약 현황을 쉽게 관리 |
| **수의사** | 문진, 예약, 환자 정보를 한 화면에서 확인하여 진료 준비 시간 단축 |
| **병원** | 전화 응대와 수기 차팅 부담을 줄이고 응급 환자 우선순위 판단 가능 |
| **반려동물** | 위험 신호를 빠르게 포착해 골든타임 확보 가능성 향상 |

---

## **13. 향후 개선 방향**

- LangGraph 기반 Multi-Agent 실제 연동
- 피부 질환 / 안구 질환 이미지 분류 모델 연결
- SOAP 형식 EMR 초안 자동 생성 고도화
- 수의사 알림 시스템 고도화
- 병원별 진료 가능 시간 자동 추천
- Follow-up 멀티턴 대화 관리
- 배포 환경 Docker Compose 구성 확장

---

## **14. 회고**

| 이름 | 회고 내용 |
| :---- | :--- |
| **김지현** &nbsp;&nbsp;&nbsp;&nbsp; | 보호자와 수의사라는 서로 다른 사용자의 화면을 설계하면서 실제 서비스 흐름을 고려한 UI 구현의 중요성을 배웠습니다. |
| **박지현** &nbsp;&nbsp;&nbsp;&nbsp; | 프론트엔드 화면을 구현하며 사용자 경험과 데이터 흐름을 함께 고민할 수 있었습니다. 특히 보호자와 병원 양쪽의 니즈를 연결하는 과정이 의미 있었습니다. |
| **조민서** &nbsp;&nbsp;&nbsp;&nbsp; | 백엔드와 DB를 설계하며 인증, 예약, 환자 정보가 하나의 진료 흐름 안에서 연결되는 구조를 고민할 수 있었습니다. |
| **이채림** &nbsp;&nbsp;&nbsp;&nbsp; | API와 데이터베이스를 구현하면서 실제 서비스에서 데이터 정합성과 확장 가능한 모델 설계가 얼마나 중요한지 경험했습니다. |
| **김찬영** &nbsp;&nbsp;&nbsp;&nbsp; | Multi-Agent 구조를 설계하며 단일 LLM 응답보다 역할을 분리한 Agent 기반 흐름이 의료 보조 서비스에 더 적합하다는 점을 배웠습니다. |
