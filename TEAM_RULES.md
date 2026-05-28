# MediPaw 팀 협업 규칙

> 이 문서를 어기는 PR은 **Merge 금지**. 명확한 예외가 있으면 팀장 승인 후 주석에 이유 기록.

---

## 1. Branch 전략

```
main          ← production-ready. 직접 push 절대 금지.
develop       ← 통합 브랜치. PR 리뷰 후만 merge.
feature/<이름> ← 기능 단위. 예: feature/emr-queue-api
fix/<이름>     ← 버그 수정.   예: fix/timezone-kst
hotfix/<이름>  ← 긴급 수정.   main 기준 분기, develop에도 merge.
```

- `main`에는 반드시 `develop` 경유 후 merge.
- feature 브랜치는 1인 1브랜치. 공유 브랜치는 `develop`뿐.
- 브랜치 수명: merge 완료 후 즉시 삭제.

---

## 2. Merge 규칙

- PR 생성 시: 변경 파일 목록 + 영향 범위 + 테스트 방법 명시.
- **최소 1인 리뷰** 승인 후 merge.
- CI(TypeScript 타입체크 + Python ast 검사) 통과 필수.
- `git merge --no-ff` 사용 (merge commit 남기기).
- squash merge 금지 (commit history 보존).

---

## 3. Mock 데이터 사용 규칙

- **Mock은 API 연결 전 임시**다. 연결 완료 즉시 제거.
- 제거 전까지 반드시 `// TODO(N순위): <API 경로> 연결 후 제거` 주석 남기기.
- Mock이 실제 agent 흐름과 충돌하면 **agent 기준 우선**, mock 제거.
- `mockData.ts` 파일에 신규 mock 추가 금지. 기존 파일 유지만 허용.

**현재 남은 mock (제거 예정):**
- `mockAutoPrescriptions` → `GET /doctor/emr/{id}/report` 연결 후 제거 (3순위)

---

## 4. Agent 수정 규칙 ⚠️ 최고 위험 영역

**아래 행위는 팀장 승인 + 전체 E2E 테스트 통과 없이 절대 금지:**

- `ai/agents/*.py` 의 system prompt 수정
- `ai/tasks.py` 의 `RUNNERS` 딕셔너리 수정
- `ai/tasks.py` 의 `save_result()` DB 저장 로직 수정
- agent 실행 순서(triage → schedule → chart → validation → judge) 변경
- `_task_store` 키 구조 변경 (`status`, `result`, `step`, `detail` 필드명)
- `POST /api/agent/run` 요청 형식 변경

**허용되는 수정:**
- 프롬프트 내 예시 데이터 수정 (결과 형식 변경 없이)
- 로깅 추가
- `max_tokens` / `temperature` 튜닝 (결과 JSON 키 변경 없이)

**수정 전 체크리스트:**
1. 이 수정이 `save_result()`가 기대하는 result 구조를 바꾸는가?
2. 이 수정이 frontend의 SSE 이벤트 파싱에 영향을 주는가?
3. 이 수정이 다른 agent의 input payload를 바꾸는가?

셋 중 하나라도 Yes면 팀 전체 논의 필요.

---

## 5. DB 수정 규칙

- **schema 변경은 반드시 Alembic migration** 경유. `ALTER TABLE` 직접 실행 금지.
- migration 파일명: `{revision}_{간단한 설명}.py`
- `upgrade()` 함수는 반드시 **idempotent** (이미 존재하면 skip): `_has_table()` 패턴 사용.
- `downgrade()` 함수는 최소한 `pass` 이상 구현.
- migration 생성 후 반드시 로컬에서 `alembic upgrade head` 성공 확인 후 PR.
- **데이터 migration (UPDATE, backfill)은 별도 migration 파일**로 분리.
- 운영 DB에 직접 DDL 실행 절대 금지. 반드시 Docker migrate 서비스 경유.

**현재 DB 정책:**
- 모든 datetime은 **UTC로 저장**, 표시 시 KST 변환.
- soft-delete: `deleted_at` column, `WHERE deleted_at IS NULL` 필터 필수.
- FK에 `ON DELETE CASCADE` 금지. 소프트 삭제 사용.

---

## 6. API Response Format 규칙

모든 응답은 아래 구조를 따른다:

```json
{"code": 200, "result": {...}}       // 성공
{"code": 201, "message": "...", "result": {...}}  // 생성 성공
{"code": 200, "message": "...", "result": null}   // 결과 없음 (에러 아님)
{"code": 4xx, "message": "한국어 에러 메시지"}    // 클라이언트 에러
```

- `result` 키는 항상 존재해야 함 (null이라도).
- 에러 상태코드 → `http_exception_handler`가 자동으로 `{"code": N, "message": "..."}` 형식으로 변환.
- **새 엔드포인트 추가 시**: 응답 형식을 먼저 팀에 공유하고 frontend와 합의 후 구현.
- 기존 응답 필드 제거/rename 금지. 필드 추가는 허용.

**SSE 이벤트 형식:**
```
data: {"status": "connecting", "task_id": "..."}
data: {"status": "running",    "step": "..."}
data: {"status": "done",       "result": {...}}
data: {"status": "error",      "detail": "..."}
data: {"status": "timeout"}
```

- `status` 값 변경/추가는 frontend SSE 파서와 동시 수정 필수.

---

## 7. ENV 관리 규칙

- `.env` 파일은 **절대 git commit 금지**. `.gitignore` 에 포함 확인.
- 신규 env 변수 추가 시: `backend/app/core/config.py`의 `Settings` 클래스에 타입과 기본값 추가.
- 팀원에게 `.env.example` 업데이트로 공지.
- `docker-compose.yml`의 env 변수 변경은 **반드시 팀 공지** 후 진행.
- 운영 secret은 팀장만 관리. 코드에 하드코딩 절대 금지.

**현재 필수 env:**
```
DATABASE_URL, SECRET_KEY, OPENAI_API_KEY,
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME
```

**ALLOWED_ORIGINS:** `config.py` 기본값으로 충분. 팀원 로컬 IP가 다르면 `.env`에 추가.

---

## 8. Docker 수정 규칙

- `docker-compose.yml` 수정은 **팀 전체에 영향**. 변경 전 팀장 승인.
- 새 서비스 추가 시: `depends_on` + `healthcheck` 필수.
- `Dockerfile.*` 수정 시: `--no-cache` 빌드로 검증 후 PR.
- port 변경 금지 (5173/5174/8000/5432 고정).
- volume 변경 시 기존 데이터 영향 여부 명시.

---

## 9. Commit Convention

```
feat:    신규 기능
fix:     버그 수정
refactor: 리팩토링 (기능 변경 없음)
chore:   빌드/도구/설정
docs:    문서
test:    테스트
```

**예시:**
```
feat(emr): add EMR queue and detail API endpoints
fix(timezone): store confirmed_time as KST-aware UTC
chore(docker): update ALLOWED_ORIGINS to use settings
```

- 제목: 50자 이내, 현재형 동사, 한/영 혼용 허용.
- 본문: 무엇을 바꿨는지가 아닌 **왜** 바꿨는지.
- `git commit -m "wip"` / `git commit -m "fix"` 금지.

---

## 10. Migration 정책

1. **기능 구현 브랜치에서 migration 생성 금지**. `develop` 기준으로만 생성.
2. 두 브랜치가 동시에 migration을 추가하면 **merge head 충돌** 발생.
   → 먼저 merge된 브랜치의 revision을 `down_revision`으로 사용해 해결.
3. merge head가 생기면 `{rev}_merge_heads.py` 생성: `alembic merge heads -m "merge heads"`.
4. `zz0001_*` 같은 강제 정렬 prefix 금지. revision ID 순서대로.

---

## 11. SSE / Event Naming 규칙

**task_store status 값 (변경 불가):**
- `queued` → `running` → `done` | `error` | `timeout`

**agent_type 값 (RUNNERS 키):**
```python
"triage" | "schedule" | "chart" | "validation" | "judge" | "followup"
```
→ 추가 시 `ai/tasks.py`의 `RUNNERS` + `ai/schemas.py`의 `AGENT_TYPES` 동시 수정 필수.

**알람 type 값:**
```python
"reservation_confirmed" | "reservation_cancelled" | "reservation_updated" | "chart_ready"
```
→ 신규 type 추가 시: `backend`(`crud/alarm.py` create 호출부) + `frontend`(`alarmApi.ts` AlarmType union + `AppLayout.tsx` config map) 동시 수정 필수.

**chat SSE 이벤트 type:**
```json
{"type": "token"}
{"type": "triage_complete", "data": {...}, "emrid": N, "schedule_task_id": "..."}
{"type": "done"}
{"type": "error", "message": "..."}
```
→ `type` 값 변경 시 guardian-web SSE 파서 동시 수정.

---

## 12. Agent 흐름 보호 규칙 (최우선)

```
[보호자 문진 흐름]
POST /chat/sessions/{id}/messages → triage SSE → schedule BG task

[예약 확정 흐름]
POST /schedules/checkup  → doctor_alarmDB 생성
POST /schedules/confirm  → chart + validation (독립 병렬) + judge (fire-and-forget) BG

[수의사 EMR 흐름]
GET  /doctor/emr/queue            ← scheduleDB + guardianDB + triageDB 조인
GET  /doctor/emr/queue/{id}       ← 5개 테이블 조인 (환자 + 트리아지 요약 + EMR 기록)
GET  /doctor/emr/{id}/report      ← reportDB
GET  /doctor/emr/{id}/triage      ← triage_resultDB
GET  /doctor/emr/{id}/validation  ← validation_resultDB
```

**이 흐름을 깨는 수정 = PR reject:**
- triage 완료 전에 schedule agent 실행
- chart/validation/judge 순서 변경 (독립 병렬 유지)
- save_result() bypass하고 직접 DB INSERT
- _task_store 없이 agent 실행 결과 처리
- 보호자 토큰으로 /doctor/* 엔드포인트 접근 허용
