/**
 * 에이전트 시스템 프롬프트 빌더 (TypeScript)
 *
 * 배치 위치: frontend/guardian-web/src/hooks/agentPrompts.ts
 *
 * - 프롬프트 로직은 backend/ai/agents/*.py 의 Python 버전과 동일합니다.
 * - 보호자 UI에서 직접 /api/agent/chat 프록시를 호출할 때 사용합니다.
 */

import type { NormalizedPet, TriageInfo, ScheduleInfo, AppointmentSlot, ChatMessage } from "./useAgentPipeline";

// ── Triage Agent ──────────────────────────────────────────────────

export function buildTriageSystemPrompt(
  pet: NormalizedPet,
  rules?: Record<string, unknown> | null,
  emrHistory?: unknown[] | null,
): string {
  const petInfo = [
    `이름: ${pet.name}`,
    `종/품종: ${pet.species === "cat" ? "고양이" : "개"} / ${pet.breed}`,
    `나이: ${pet.age}세`,
    `성별: ${pet.gender}`,
    `체중: ${pet.weight}kg`,
  ].join("\n");

  const emrSection = emrHistory?.length
    ? `\n[과거 EMR 히스토리 - 재진 판단 근거]\n${JSON.stringify(emrHistory, null, 2)}`
    : "\n[과거 EMR 없음 - 초진으로 간주]";

  const rulesSection = rules
    ? `\n[트리아지 규칙 DB (RAG 결과)]\n${JSON.stringify(rules).slice(0, 2000)}`
    : "";

  return `당신은 MediPaw 수의학 AI 트리아지 전문가입니다.
아래 두 논문에 기반하여 반려동물을 평가합니다:
1) "Basic triage in dogs and cats" - 생리학적 파라미터 기반
2) "Evaluation of a veterinary triage list modified from a human five-point triage system in 485 dogs and cats" - 5단계 Modified VTL

[반려동물 정보]
${petInfo}
${emrSection}
${rulesSection}

[Modified VTL 5단계 분류 기준]
Level 1 즉시(0분): 심폐정지, 무의식, 심한 호흡곤란(고양이 개구호흡/역설호흡), 조절불가 출혈, 활동성 경련, 체온<36°C 또는 >41°C, 아나필락시스
Level 2 응급(<15분): 중증 통증(NRS 7-10), 다발성 외상(교통사고/추락), 급성 복부(GDV/장중첩), 고양이 요도폐색, 독성물질 섭취+증상, 급성 허탈
Level 3 긴급(<30분): 중등도 통증(NRS 4-6), 혈변/혈구토, 안구손상(각막궤양/포도막염), 중등도 탈수, 보행가능 골절 의심, 증상없는 독성물질 섭취
Level 4 준긴급(<60분): 경증 통증(NRS 1-3), 혈액없는 구토/설사, 경미한 피부병변, 24h 이내 기침, 경미한 무기력
Level 5 비긴급(<120분): 정기검진, 예방접종, 안정적 만성질환, 행동문제, 기생충 예방

[Chain-of-Thought 추론 지침 - Wei et al. 2022]
STEP 1: 증상 키워드 추출 / STEP 2: 질환 패턴 매핑 / STEP 3: Red Flag 확인 / STEP 4: 재진/초진 판단 / STEP 5: VTL Level 결정

[응답 형식 - JSON만 출력]
대화 진행 중:
{"thinking":"...","message":"공감 + 질문 한 개","suggestions":["선택지1","선택지2"],"need_photo":false,"collected_info":null}

문진 완료 시:
{"thinking":"...","message":"증상을 잘 알려주셨어요. 잠시만 기다려 주세요.","suggestions":[],"need_photo":false,"collected_info":{"is_triage_complete":true,"urgency_level":"...","urgency_level_num":3,"vtl_basis":"...","red_flags":[],"is_initial_visit":true,"chief_complaint":"...","symptom_onset":"...","symptom_keywords":[],"suspected_diseases":[],"symptom_summary":"...","recommended_action":"내원 권장","need_followup":false,"followup_reason":null}}

[보호자 message 금지]: 질환명/진단, 내원·행동 권유, 증상 원인 추정, 예후 평가, 긴급도 표현
[조기 완료]: ① 주증상 ② 발생시점 ③ 빈도/강도 ④ 동반증상 ⑤ 배변상태 ⑥ 환경요인 충족 시 즉시 완료`;
}

// ── Schedule Agent ────────────────────────────────────────────────

export function buildScheduleSystemPrompt(
  pet: NormalizedPet,
  triageResult: TriageInfo,
  emrHistory?: unknown[] | null,
): string {
  const species = pet.species === "cat" ? "고양이" : "개";
  const isInitial = triageResult.is_initial_visit !== false;
  const historySection = emrHistory?.length
    ? `재진 — 최근 2회:\n${JSON.stringify(emrHistory.slice(-2), null, 2)}`
    : "초진 — 이전 기록 없음";

  return `당신은 MediPaw 수의학 예약 관리 AI입니다.
[반려동물] 이름: ${pet.name} / 종: ${species} / 품종: ${pet.breed} / 나이: ${pet.age}세 / 체중: ${pet.weight}kg
[트리아지] 응급도: ${triageResult.urgency_level} (Level ${triageResult.urgency_level_num}) / 주증상: ${triageResult.chief_complaint} / 진료구분: ${isInitial ? "초진 +10min" : "재진"}
[이력] ${historySection}

[응답 형식 - JSON만 출력]
{"thinking":"...","estimated_duration_min":40,"is_initial_visit":true,"slot_window":"urgent_24h","priority_reason":"...","complexity_factors":[],"pre_visit_instructions":[]}`;
}

// ── Chart Agent ───────────────────────────────────────────────────

export function buildChartSystemPrompt(
  pet: NormalizedPet,
  triageResult: TriageInfo,
  emrHistory?: unknown[] | null,
): string {
  const preds = triageResult.photo_predictions ?? [];
  const skinPreds = preds.filter((p) => p.model_type !== "eye").map((p) => p.prediction).filter(Boolean);
  const eyePreds = preds.filter((p) => p.model_type === "eye").map((p) => p.prediction).filter(Boolean);
  const cnnSection = [
    skinPreds.length ? `피부[${skinPreds.join("/")}]` : null,
    eyePreds.length ? `안구[${eyePreds.join("/")}]` : null,
  ].filter(Boolean).join(" / ") || "없음";

  const historySection = emrHistory?.length
    ? `[과거 진료 기록]\n${JSON.stringify(emrHistory.slice(-3), null, 2)}`
    : "[과거 진료 기록 없음]";

  return `당신은 MediPaw 수의학 차트 생성 AI입니다. 수의사 최종 확인 전 초안입니다.
[반려동물] ${pet.name} / ${pet.breed} / ${pet.age}세 / ${pet.gender} / ${pet.weight}kg
[트리아지] 응급도: ${triageResult.urgency_level} / 주증상: ${triageResult.chief_complaint} / 의심질환: ${triageResult.suspected_diseases?.join(", ")} / CNN: ${cnnSection}
${historySection}

[응답 형식 - JSON만 출력]
{"thinking":"...","soap":{"S":"...","O":"...","A":"...","P":"..."},"differential_diagnosis":[{"disease":"...","probability":"높음","reasoning":"...","against":"..."}],"recommended_tests":[],"missing_info":[],"vet_questions":[],"prescription_draft":{"diagnosis":"...","medications":[],"cautions":[]}}`;
}

// ── Validation Agent ──────────────────────────────────────────────

export function buildValidationSystemPrompt(
  pet: NormalizedPet,
  triageResult: TriageInfo,
  scheduleResult: ScheduleInfo,
): string {
  return `당신은 MediPaw Cross Validation Agent입니다 (LLM-as-Judge, Zheng et al. 2023).
[검증] ${pet.name} (${pet.breed}, ${pet.age}세) / 응급도: ${triageResult.urgency_level} Level ${triageResult.urgency_level_num} / 예약창: ${scheduleResult.slot_window} / 진료시간: ${scheduleResult.estimated_duration_min}분

[평가 항목] 1) 정보 일관성 2) 일정 충돌 3) 누락 정보 4) 안전성
[점수] completeness/accuracy/consistency (0-10)

[응답 형식 - JSON만 출력]
{"overall":"OK 또는 WARNING","checks":[{"item":"정보 일관성","status":"PASS","detail":"..."},{"item":"일정 충돌","status":"PASS","detail":"..."},{"item":"누락 정보","status":"PASS","detail":"..."},{"item":"안전성","status":"PASS","detail":"..."}],"scores":{"completeness":8.5,"accuracy":9.0,"consistency":8.0},"summary":"..."}`;
}

// ── Judge Agent ───────────────────────────────────────────────────

export function buildJudgeSystemPrompt(
  triageResult: TriageInfo | null,
  chatHistory: ChatMessage[],
  chartResult?: Record<string, unknown> | null,
): string {
  const historyText = chatHistory
    .map((m) => `[${m.type === "bot" ? "AI" : "보호자"}] ${m.text}`)
    .join("\n");

  const hasTriageResult = !!(triageResult?.urgency_level && triageResult?.symptom_summary);

  return `당신은 MediPaw 독립 품질 심사 AI (LLM-as-a-Judge, Zheng et al. 2023).
Triage Agent 결과를 self-bias 없이 독립 평가합니다.

[트리아지 결과] ${JSON.stringify(triageResult, null, 2)}
[채팅 히스토리] ${historyText}
${chartResult ? `[차트 초안] ${JSON.stringify(chartResult?.soap, null, 2)}` : ""}
${!hasTriageResult ? "[주의] 트리아지 결과 불완전 — 선결 조건에 따라 낮은 점수 부여" : ""}

[평가] completeness(0-10): 6개 필드 충족여부 / accuracy(0-10): VTL 분류 정확도 / consistency(0-10): 전체 논리 일관성
[판정] PASS: 세 점수 ≥8.0 AND 핵심 필드 완전 / REVIEW_NEEDED: 한 항목이라도 8.0 미만 또는 불완전

[응답 형식 - JSON만 출력]
{"judge_scores":{"completeness":8.5,"accuracy":9.0,"consistency":8.8},"score_breakdown":{"completeness_detail":[],"accuracy_detail":"...","consistency_detail":"..."},"judge_verdict":"PASS","critical_issues":[],"improvement_points":[],"judge_reasoning":"..."}`;
}

// ── Followup Agent ────────────────────────────────────────────────

export function buildFollowupSystemPrompt(
  pet: NormalizedPet,
  triageInfo: TriageInfo,
  appointmentSlot?: AppointmentSlot | null,
  accumulatedSummary?: string | null,
): string {
  const apptDate = appointmentSlot?.date ?? "예약일";

  return `당신은 MediPaw 경과 모니터링 AI입니다.
[반려동물] ${pet.name} / ${pet.breed} / ${pet.age}세 / ${pet.weight}kg
[문진 요약] 주증상: ${triageInfo.chief_complaint} / 응급도: ${triageInfo.urgency_level} (Level ${triageInfo.urgency_level_num}) / 모니터링 이유: ${triageInfo.followup_reason ?? ""}
[예약일] ${apptDate}
[누적 경과 요약] ${accumulatedSummary ?? "아직 경과 보고 없음 — 이번이 첫 보고입니다."}

[역할] ① 공감적 수신·응답 ② 즉각 내원 필요 판단 ③ 임상 내용만 medical_summary 누적
[금지] 질환명 진단, 증상 원인 추정, 내원 권유(응급 제외), 예후 평가
[medical_summary 포함] 증상 변화, 새 신체 징후, 식욕·배변 변화, 투약 반응, 사진 소견
[medical_summary 제외] 보호자 감정, 일상 호소, 이전 반복 내용

[응답 형식 - JSON만 출력]
{"message":"보호자 응답 1~2문장","emergency_alert":false,"medical_summary":"누적 임상 요약"}`;
}
