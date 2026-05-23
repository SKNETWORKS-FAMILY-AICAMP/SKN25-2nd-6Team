# MediPaw — 팀원 온보딩 Walkthrough

> 처음 이 프로젝트를 받은 팀원이 **로컬에서 전체 서비스를 구동하고 테스트하는 데** 필요한 모든 단계를 담습니다.

---

## 0. 사전 요구사항

| 도구 | 버전 | 비고 |
|---|---|---|
| Python | 3.11 | pyenv 사용 권장 |
| Node.js | 18+ | nvm 사용 권장 |
| PostgreSQL | 14+ | 로컬 설치 또는 Docker |
| Git | - | |

---

## 1. 저장소 복제

```bash
git clone https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN25-FINAL-1Team.git
cd SKN25-FINAL-1Team

# 또는 개인 fork에서 작업 시
git remote add team https://github.com/SKNETWORKS-FAMILY-AICAMP/SKN25-FINAL-1Team.git
git fetch team
git checkout -b chan team/chan   # 최신 통합 브랜치
```

---

## 2. 데이터베이스 준비

```bash
# PostgreSQL 로컬 접속 후 DB 생성
psql -U postgres
CREATE USER medipaw WITH PASSWORD 'medipaw123';
CREATE DATABASE medipaw OWNER medipaw;
\q
```

---

## 3. 백엔드 환경 설정

### 3-1. Python 가상환경 및 의존성

```bash
cd backend

# pyenv로 Python 3.11 선택 (선택)
pyenv local 3.11.9

python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

> **주의:** `bcrypt==4.0.1` 이 requirements.txt에 고정되어 있습니다.  
> 신규 bcrypt(4.1+)는 passlib 호환성 문제가 있으므로 임의 업그레이드 금지.

### 3-2. .env 파일 생성

`backend/.env` 파일을 아래 내용으로 새로 만듭니다 (팀 공유 채널에서 실제 값 수령):

```env
DATABASE_URL=postgresql+asyncpg://medipaw:medipaw123@localhost:5432/medipaw
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=14

OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=medipaw-storage
CLOUDFRONT_URL=

DEBUG=true
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

> `.env` 파일은 절대 git commit 금지입니다. `.gitignore`에 이미 포함됩니다.

### 3-3. DB 마이그레이션

```bash
# backend/ 디렉토리 안에서 실행
alembic upgrade head
```

### 3-4. 백엔드 서버 실행

```bash
# PYTHONPATH에 프로젝트 루트를 포함해야 ai/ 모듈 임포트가 정상 작동합니다
PYTHONPATH=/path/to/medipaw_integrate uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> `--reload` 플래그로 코드 변경 시 자동 재시작됩니다.  
> asyncpg prepared-statement 캐시 문제가 발생하면 서버를 수동 재시작하세요.

---

## 4. 시드 데이터 주입

서버가 실행 중인 상태에서 **다른 터미널**을 열어 실행합니다.

```bash
cd backend
source .venv/bin/activate

# 테스트 계정 생성 (보호자 + 수의사)
DATABASE_URL=postgresql://medipaw:medipaw123@localhost:5432/medipaw \
  python scripts/create_test_accounts.py

# 과거 EMR 병력 mock 데이터 주입 (재진 시나리오 테스트용)
DATABASE_URL=postgresql://medipaw:medipaw123@localhost:5432/medipaw \
  python scripts/seed_mock_emr.py
```

---

## 5. 프론트엔드 실행

### 5-1. 보호자용 웹 (http://localhost:5173)

```bash
cd frontend/guardian-web
npm install
npm run dev
```

### 5-2. 수의사용 웹 (http://localhost:5174)

```bash
cd frontend/vet-web
npm install
npm run dev
```

---

## 6. 테스트 시나리오 (Happy Path)

### 시나리오 A: 보호자 챗봇 예약

1. `http://localhost:5173` 접속
2. **아이디:** `guardian_test` / **비밀번호:** `Test1234!` 로 로그인
3. 챗봇 메뉴 진입 → 반려동물 `뽀미` 선택
4. "구토" pill 클릭 또는 직접 입력 → Triage 분석 스트리밍 시작
5. 예약 가능 슬롯 확인 → 슬롯 선택 또는 "직접 날짜 선택하기" 달력 사용
6. 예약 확정 메시지 확인
7. (선택) 경과 모니터링 메시지 전송 → Followup Agent 응답 확인

### 시나리오 B: 수의사 대시보드

1. `http://localhost:5174` 접속
2. **아이디:** `vet_test` / **비밀번호:** `Test1234!` 로 로그인
3. 오늘의 예약 대기 목록 확인
4. EMR 큐 → 환자 클릭 → AI 차트 초안 (SOAP) 확인
5. 정합성 검증 점수 시각화 확인
6. 예약 삭제(소프트 삭제) 테스트: 삭제 후 슬롯 해제 확인

---

## 7. 주요 API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/auth/login` | 보호자 로그인 |
| POST | `/doctor/auth/login` | 수의사 로그인 |
| GET | `/pets` | 반려동물 목록 |
| POST | `/chat/sessions` | 챗봇 세션 생성 |
| POST | `/chat/sessions/{id}/messages` | 챗봇 메시지 전송 (SSE) |
| POST | `/api/agent/run` | AI 에이전트 태스크 시작 |
| GET | `/api/agent/sse/{task_id}` | 에이전트 결과 SSE 스트림 |
| GET | `/schedules/available` | 예약 가능 슬롯 조회 |
| POST | `/schedules/confirm` | 예약 확정 |
| POST | `/followup` | 경과 모니터링 메시지 전송 |
| DELETE | `/doctor/reservations/{id}` | 예약 삭제 (소프트) |

전체 API 스펙: `http://localhost:8000/docs` (Swagger UI)

---

## 8. 로그 파일 확인

```bash
# 프로젝트 루트의 logs/ 디렉토리
tail -f logs/app.log        # 전체 애플리케이션 로그
tail -f logs/triage.log     # Triage Agent 로그
tail -f logs/validation.log # Validation Agent 로그
tail -f logs/followup.log   # Followup Agent 로그
tail -f logs/audit.log      # 감사(audit) 로그
```

---

## 9. 자주 만나는 오류

| 오류 | 원인 | 해결 |
|---|---|---|
| `asyncpg.exceptions._base.InterfaceError: cannot perform operation` | prepared statement 캐시 stale | 백엔드 서버 재시작 |
| `MissingBackendError` (bcrypt) | bcrypt 버전 4.1+ 설치됨 | `pip install bcrypt==4.0.1` |
| `ModuleNotFoundError: ai` | PYTHONPATH 누락 | `PYTHONPATH=프로젝트루트` 환경변수 추가 |
| `500 on DELETE /doctor/reservations` | asyncpg 캐시 또는 상태 누락 | 서버 재시작 후 재시도 |
| `emrid 없음` 챗봇 에러 | Triage 완료 전 Schedule 진입 | 페이지 새로고침 후 처음부터 시작 |

---

## 10. 브랜치 전략 (요약)

```
main          ← 배포용 (직접 push 금지)
develop       ← 통합 기준 (PR merge 대상)
chan           ← 현재 통합 작업 브랜치 (팀 공유)
feature/xxx   ← 개인 기능 브랜치 (develop에서 분기)
```

> 마이그레이션 생성은 반드시 `develop` 기준으로만 진행하고, 기능 브랜치에서는 migration 생성 금지.
