from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import json
import asyncio
from datetime import date
from openai import AsyncOpenAI
from app.db.session import get_db
from app.schemas.chat import ChatSessionCreate, ChatMessageRequest
from app.crud.chat import (
    create_chat_session, get_chat_session, get_chat_sessions_by_petid,
    add_message, delete_chat_session, update_session_complete,
)
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.models.pet import Pet

router = APIRouter(prefix="/chat", tags=["chat"])

FORCE_COMPLETE_SUFFIX = """

[완료 요청]
충분한 턴이 진행되었습니다. 지금까지 수집된 정보로 즉시 완료 형식(is_triage_complete: true, collected_info 포함)으로 응답하세요.
추론으로 정보를 채우지 마세요. 정보가 부족한 경우: urgency_level_num을 보수적으로 설정하고, 수집되지 않은 문자열 필드는 ""로, 배열 필드는 []로 두세요. 추가 질문은 하지 마세요."""


def _build_triage_system_prompt(pet: Pet, force_complete: bool = False) -> str:
    age = None
    if pet.birth_date:
        age = date.today().year - pet.birth_date.year

    gender_str = "미상"
    if pet.gender == "male":
        gender_str = "수컷"
    elif pet.gender == "female":
        gender_str = "암컷"

    pet_info = "\n".join([
        f"이름: {pet.petname}",
        f"종/품종: {'고양이' if pet.species == 'cat' else '개'} / {pet.breed or '알 수 없음'}",
        f"나이: {age if age else '?'}세",
        f"성별: {gender_str}",
        f"체중: {float(pet.weight_kg) if pet.weight_kg else '?'}kg",
    ])

    prompt = f"""당신은 MediPaw 수의학 AI 트리아지 전문가입니다.
아래 두 논문에 기반하여 반려동물을 평가합니다:
1) "Basic triage in dogs and cats" - 생리학적 파라미터 기반
2) "Evaluation of a veterinary triage list modified from a human five-point triage system in 485 dogs and cats" - 5단계 Modified VTL

[반려동물 정보]
{pet_info}
[과거 EMR 없음 - 초진으로 간주]

[Modified VTL 5단계 분류 기준]
Level 1 즉시(0분): 심폐정지, 무의식, 심한 호흡곤란(고양이 개구호흡/역설호흡), 조절불가 출혈, 활동성 경련, 체온<36°C 또는 >41°C, 아나필락시스
Level 2 응급(<15분): 중증 통증(NRS 7-10), 다발성 외상(교통사고/추락), 급성 복부(GDV/장중첩), 고양이 요도폐색, 독성물질 섭취+증상, 급성 허탈
Level 3 긴급(<30분): 중등도 통증(NRS 4-6), 혈변/혈구토, 안구손상(각막궤양/포도막염), 중등도 탈수, 보행가능 골절 의심, 증상없는 독성물질 섭취
Level 4 준긴급(<60분): 경증 통증(NRS 1-3), 혈액없는 구토/설사, 경미한 피부병변, 24시간 이내 기침, 경미한 무기력
Level 5 비긴급(<120분): 정기검진, 예방접종, 안정적 만성질환, 행동문제, 기생충 예방

[생리학적 Red Flag 파라미터]
개 정상범위: 심박수 60-180bpm, 호흡수 18-34bpm, 체온 38-39.2°C, CRT 2초 미만, 점막 분홍색
고양이 정상범위: 심박수 140-220bpm, 호흡수 16-40bpm, 체온 38-39.2°C, CRT 2초 미만, 점막 분홍색

[Chain-of-Thought 추론 지침]
매 응답은 반드시 다음 5단계 추론을 거친다. thinking 필드는 각 STEP을 한 문장으로 간결하게 작성:
STEP 1: 보호자 발화에서 증상 키워드 추출 (증상명, 발생시점, 빈도, 동반증상)
STEP 2: 추출한 증상을 알려진 질환 패턴과 매핑 (감별진단 가설 생성)
STEP 3: Red Flag 파라미터 위반 여부 확인
STEP 4: 재진/초진 판단 및 진행 추이 평가
STEP 5: STEP 1-4를 종합하여 Modified VTL Level 결정 및 근거 명시

[언어 규칙 — 최우선]
message 필드는 반드시 순수 한국어로만 작성하세요. 영어 단어, 영어 의학 용어, 알파벳을 절대 사용하지 마세요.
예시: pill→알약, vomiting→구토, cough→기침, respiratory→호흡, symptom→증상

[응답 형식 - JSON만 출력, 다른 텍스트 절대 금지]

대화 진행 중:
{{
  "thinking": "STEP 1: ... STEP 2: ... STEP 3: ... STEP 4: ... STEP 5: ...",
  "message": "공감 한 마디 + 구체적인 질문 한 개",
  "suggestions": ["답변 선택지1", "선택지2", "선택지3"],
  "need_photo": false,
  "collected_info": null
}}

문진 완료 시 (핵심 정보가 충분히 수집되면 즉시 완료):
{{
  "thinking": "STEP 1~5 실제 추론",
  "message": "증상을 잘 알려주셨어요. 잠시만 기다려 주세요.",
  "suggestions": [],
  "need_photo": false,
  "collected_info": {{
    "is_triage_complete": true,
    "urgency_level": "<즉시|응급|긴급|준긴급|비긴급 중 하나>",
    "urgency_level_num": 3,
    "vtl_basis": "<실제 증상 기반 VTL 판단 근거>",
    "red_flags": [],
    "is_initial_visit": true,
    "chief_complaint": "<보호자가 말한 주증상>",
    "symptom_onset": "<보호자가 말한 발생시점>",
    "symptom_keywords": ["<실제 증상 키워드들>"],
    "suspected_diseases": ["<실제 감별진단 2~3개>"],
    "symptom_summary": "<보호자 발화 기반 실제 증상 요약>",
    "recommended_action": "내원 권장",
    "need_followup": false,
    "followup_reason": null
  }}
}}

[경과 모니터링 필요 여부 — need_followup]
need_followup=true 조건: 발작·경련, 당일 반복 구토·설사(3회 이상), 혈변·혈구토, 외상·출혈 진행, 호흡 이상, 의식·활동성 급격 저하, 중독·이물 섭취
need_followup=false 조건: 정기 검진, 예방접종, 안정적 만성 질환, 경미한 가려움

[보호자 message 금지 사항]
- 질환명/진단 언급, 내원·행동 권유, 증상 원인 추정, 예후 평가, 긴급도 표현 금지
- 수치 기반 통증 점수(NRS 1~10) 직접 질문 금지 — 보호자가 정확히 평가할 수 없음. 대신 행동·상태로 간접 평가: "밥을 잘 먹나요?", "평소보다 덜 움직이나요?", "안거나 만지면 아파하나요?" 등
- 허용 공감: "많이 걱정되시겠어요", "잘 알려주셨어요", "조금 더 여쭤볼게요"
- 공감 표현 뒤에는 반드시 구체적인 질문 한 개를 이어서 작성

[조기 완료 원칙]
다음 6가지 항목 충족 시 즉시 is_triage_complete: true:
① 주증상 ② 발생시점 ③ 빈도/강도 ④ 동반증상(식욕/활동성) ⑤ 배변상태 ⑥ 환경요인
응급 징후(Red Flag)가 명확한 경우 1-2턴 이내 완료 가능.

[사진 첨부 시 분석 지침]
① 사진에서 보이는 모든 소견을 먼저 독립적으로 기술
② 사진에서 이미 확인된 소견은 절대 다시 묻지 않음
③ 측정 불가 항목 질문 금지: 심박수, 호흡수, 점막색, 주관적 통증 강도"""

    if force_complete:
        prompt += FORCE_COMPLETE_SUFFIX

    return prompt


# 챗봇 세션 시작
@router.post("/sessions", status_code=201)
async def start_chat_session(
    request: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(
        select(Pet).where(Pet.petid == request.pet_id, Pet.userid == current_user.userid)
    )
    pet = result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")

    session = await create_chat_session(db, current_user.userid, request.pet_id)
    return {
        "code": 201,
        "result": {
            "session_id": session.id,
            "pet_name": pet.petname,
            "profile_image": pet.profile_image,
        },
    }


# 챗봇 메시지 전송 (SSE 스트리밍)
@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: int,
    request: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not request.content:
        raise HTTPException(status_code=400, detail="메시지를 입력해주세요.")

    session = await get_chat_session(db, session_id, current_user.userid)
    if not session:
        raise HTTPException(status_code=404, detail="상담 세션을 찾을 수 없습니다.")

    pet_result = await db.execute(select(Pet).where(Pet.petid == session.petid))
    pet = pet_result.scalar_one_or_none()
    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")

    await add_message(db, session, "user", request.content, request.image_url)

    openai_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in (session.messages or [])
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]

    turn_count = sum(1 for m in openai_messages if m["role"] == "assistant")
    force_complete = turn_count >= 7

    system_prompt = _build_triage_system_prompt(pet, force_complete=force_complete)

    async def event_stream():
        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

            # JSON 모드로 전체 응답 수신
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL or "gpt-4o",
                messages=[{"role": "system", "content": system_prompt}] + openai_messages,
                response_format={"type": "json_object"},
                max_tokens=800,
                temperature=0.3,
            )

            raw = response.choices[0].message.content or ""

            # JSON 파싱 (마크다운 래핑 제거)
            clean = raw.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

            try:
                parsed = json.loads(clean)
            except json.JSONDecodeError:
                parsed = {"message": raw, "suggestions": [], "collected_info": None}

            message_text = parsed.get("message", "")
            suggestions = parsed.get("suggestions") or []
            collected_info = parsed.get("collected_info")

            # AI 응답 DB 저장
            await add_message(db, session, "assistant", message_text)

            # message 텍스트를 청크로 스트리밍
            chunk_size = 10
            for i in range(0, len(message_text), chunk_size):
                chunk = message_text[i:i + chunk_size]
                yield f"data: {json.dumps({'type': 'message', 'content': chunk}, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.02)

            # 에이전트가 제시한 선택지 전송
            if suggestions:
                yield f"data: {json.dumps({'type': 'quick_replies', 'options': suggestions}, ensure_ascii=False)}\n\n"

            # 문진 완료 처리
            if collected_info and collected_info.get("is_triage_complete"):
                keywords = collected_info.get("symptom_keywords") or []
                await update_session_complete(db, session, keywords)
                yield f"data: {json.dumps({'type': 'triage_complete', 'data': collected_info}, ensure_ascii=False)}\n\n"

            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# 이미지 업로드 URL 발급
@router.get("/upload/presigned-url")
async def get_presigned_url(
    file_name: str = Query(...),
    content_type: str = Query(...),
    file_size: int = Query(...),
    current_user=Depends(get_current_user),
):
    allowed_types = ["image/jpeg", "image/png", "video/mp4"]
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="이미지(JPG, PNG) 또는 영상(MP4) 파일만 업로드 가능합니다.")

    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="파일 크기는 5MB 이하만 업로드 가능합니다.")

    # TODO: AWS S3 Presigned URL 발급 예정
    return {
        "code": 200,
        "result": {
            "presigned_url": "https://s3.amazonaws.com/temp",
            "cloudfront_url": "https://cloudfront-url/temp",
        },
    }


# 상담 기록 목록 조회
@router.get("/sessions")
async def get_chat_sessions(
    pet_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    sessions = await get_chat_sessions_by_petid(db, current_user.userid, pet_id)
    return {
        "code": 200,
        "result": [
            {
                "session_id": session.id,
                "keywords": session.keywords or [],
                "created_at": str(session.created_at.date()),
                "status": "진료완료" if session.is_complete else "상담중",
            }
            for session in sessions
        ],
    }


# 특정 세션 상세 조회
@router.get("/sessions/{session_id}")
async def get_chat_session_detail(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = await get_chat_session(db, session_id, current_user.userid)
    if not session:
        raise HTTPException(status_code=404, detail="상담 기록을 찾을 수 없습니다.")

    return {
        "code": 200,
        "result": {
            "session_id": session.id,
            "pet_id": session.petid,
            "messages": session.messages or [],
            "keywords": session.keywords or [],
            "is_complete": session.is_complete,
            "created_at": str(session.created_at),
        },
    }


# 상담 기록 삭제
@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    session = await get_chat_session(db, session_id, current_user.userid)
    if not session:
        raise HTTPException(status_code=404, detail="상담 기록을 찾을 수 없습니다.")

    if session.userid != current_user.userid:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다.")

    await delete_chat_session(db, session)
    return {"code": 200, "message": "상담 기록이 삭제되었습니다."}
