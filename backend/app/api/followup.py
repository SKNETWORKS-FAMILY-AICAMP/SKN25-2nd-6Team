from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.followup import Followup
from app.models.guardian import Guardian

router = APIRouter(prefix="/followup", tags=["followup"])


class FollowupCreate(BaseModel):
    emrid: int
    images: List[str]
    message: Optional[str] = None


# 경과사진 등록
@router.post("", status_code=201)
async def create_followup(
    request: FollowupCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(Guardian).where(Guardian.emrid == request.emrid))
    guardian = result.scalar_one_or_none()
    if not guardian:
        raise HTTPException(status_code=404, detail="문진 정보를 찾을 수 없습니다.")

    followup = Followup(
        emrid=request.emrid,
        userid=current_user.userid,
        images=request.images,
        message=request.message
    )
    db.add(followup)
    await db.commit()
    await db.refresh(followup)

    return {
        "code": 201,
        "message": "경과 사진이 등록되었습니다.",
        "result": {"followup_id": followup.followupid}
    }


# 경과사진 목록 조회
@router.get("/{emrid}")
async def get_followups(
    emrid: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(
        select(Followup).where(Followup.emrid == emrid).order_by(Followup.created_at.asc())
    )
    followups = result.scalars().all()

    return {
        "code": 200,
        "result": [
            {
                "followup_id": f.followupid,
                "images": f.images,
                "message": f.message,
                "created_at": str(f.created_at)
            }
            for f in followups
        ]
    }


# 이미지 업로드 URL 발급
@router.get("/upload/presigned-url")
async def get_presigned_url(
    file_name: str = Query(...),
    content_type: str = Query(...),
    file_size: int = Query(...),
    current_user = Depends(get_current_user)
):
    allowed_types = ["image/jpeg", "image/png"]
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="이미지(JPG, PNG) 파일만 업로드 가능합니다.")

    if file_size > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="파일 크기는 5MB 이하만 업로드 가능합니다.")

    # TODO: S3 Presigned URL 발급
    return {
        "code": 200,
        "result": {
            "presigned_url": "https://s3.amazonaws.com/temp",
            "cloudfront_url": "https://cloudfront-url/temp"
        }
    }
