# MediPaw — Task Status

> 기준일: 2026-05-23 | 브랜치: `integrate` (팀 공유: `chan` @ SKN25-FINAL-1Team)

---

## 완료된 작업 (Done)

### 인프라 / 백엔드

- [x] FastAPI + async SQLAlchemy 2.0 + asyncpg 풀 스택 연동
- [x] Docker Compose 멀티플랫폼(AMD64/ARM64) 빌드 설정
- [x] 로그 파일 구조화 (`logs/app.log`, `triage.log`, `validation.log`, `followup.log`, `audit.log`)
- [x] asyncpg prepared-statement cache stale → 백엔드 재시작으로 해소
- [x] `bcrypt==4.0.1` passlib 호환성 고정 (`requirements.txt`)
- [x] `create_test_accounts.py` — `email` / `created_at` 컬럼 불일치 수정
- [x] `seed_mock_emr.py` — 과거 EMR 시드 데이터 정상화

### AI 에이전트 파이프라인

- [x] 6-agent 파이프라인 연동: Triage → Schedule → Chart → Validation → Judge → Followup
- [x] Triage Agent: 증상 카테고리 매핑 (`_SYMPTOM_CATEGORY_MAP`) 수정  
  - 기존: "구토" → 호흡기(code=2)  
  - 수정: "구토" → 소화기(code=1)
- [x] `create_triage_guardian`: 기본값 code=10(기타) → triage 완료 후 `update_guardian_category` 업데이트
- [x] Schedule Agent SSE 스트리밍: `runAgentTask` / `streamAgentResult` 임포트 누락 수정
- [x] `_task_store` in-memory dict: 5분 TTL, asyncio 기반 유지 (RabbitMQ/Redis 미도입)
- [x] Followup Agent: 10초 타임아웃 + Graceful Fallback

### 예약 오케스트레이션

- [x] `DELETE /doctor/reservations/{id}` — 500 오류 수정 (asyncpg 캐시 + 상태 명시적 설정)
- [x] `confirmSchedule` — `emrid` + `doctorid` 필드 정확히 전달
- [x] 슬롯 `doctorid` 수집 로직 (`collected` 배열 타입 수정)
- [x] 예약 충돌 감지 (`has_time_conflict`) + 중복 예약 감지 (`DuplicatePetReservation`)
- [x] 소프트 삭제 (`deleted_at` + `status=CANCELLED`) + VetSchedule 슬롯 해제

### 챗봇 UX

- [x] 초기 메시지: "어떤 증상 때문에 예약을 원하시나요?" 자동 출력
- [x] 증상 pill 버튼 (구토/설사/피부/기침/식욕저하/눈물/절뚝거림) — 세션 시작 시 표시
- [x] chatPhase 상태 머신: IDLE → SYMPTOM_COLLECTING → TRIAGE_RUNNING → SLOT_RECOMMENDING → BOOKING_CONFIRMED → FOLLOWUP_ACTIVE
- [x] `직접 날짜 선택하기 📅` 버튼 (SLOT_RECOMMENDING 상태)
- [x] `ChatDatePicker` 컴포넌트: 30일 이내 달력 + 시간 슬롯 조회

### 디자인 일관성

- [x] `@layer components` 토큰 추가 (guardian-web / vet-web 공통)
  - `.mp-card` — 카드 패딩/라운드/그림자
  - `.mp-section-title` — 섹션 제목 타이포그래피
  - `.mp-btn-primary` / `.mp-btn-secondary` — 버튼 높이(h-11) 통일
  - `.mp-chip` — 상태 배지 / 증상 pill

### Git / 문서화

- [x] `chan` 브랜치 생성 및 팀 원격 저장소(`SKN25-FINAL-1Team`) push
- [x] `TEAM_RULES.md` 작성 (브랜치 전략, 커밋 컨벤션)
- [x] README.md: 시스템 아키텍처, 포트 정보, 실행 순서, Mermaid 다이어그램

---

## 진행 중 / 남은 작업 (In Progress / TODO)

### 문서화

- [ ] README.md — 섹션 6: ERD 추가 (현재 5와 7 사이 누락)
- [ ] README.md — 파일 구조(File Structure) 섹션 추가
- [ ] `walkthrough.md` — 팀원 온보딩용 단계별 실행 가이드
- [ ] `task.md` — 이 파일 (완료)

### 버그 / 개선 (미완)

- [ ] Follow-up 정책 구조 문서화 (이미지 제한, 쿨다운, 세션 유효 기간)
- [ ] vet-web TypeScript 타입 검사 전체 통과 확인 (`npm run type-check`)
- [ ] `mp-card` / `mp-btn-primary` 등 디자인 토큰을 실제 기존 컴포넌트에 점진적 적용

### 아키텍처 (미결정)

- [ ] 하루 100건 초과 시 asyncio → 경량 task queue 전환 검토 시점 기준 설정
- [ ] S3 이미지 업로드 실 연동 (현재 로컬 스토리지 폴백)

---

## 정책 / 제약 사항 (운영 중 준수)

| 항목 | 내용 |
|---|---|
| Task Queue | RabbitMQ / Celery / Redis **미도입**, asyncio + in-memory 유지 |
| Migration | 설명 먼저 → 승인 후 실행, `develop` 기준으로만 생성 |
| `.env` | Git commit **금지** |
| 디자인 변경 | 전체 redesign 금지, spacing/typography/card padding/button height 미세 보정만 |
| Commit 단위 | atomic, rollback 가능 단위 유지 |
