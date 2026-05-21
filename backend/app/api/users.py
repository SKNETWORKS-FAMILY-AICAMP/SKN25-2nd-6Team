from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.security import verify_password, hash_password

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
async def get_my_profile(current_user = Depends(get_current_user)):
    return {
        "code": 200,
        "result": {
            "name": current_user.name,
            "phone": current_user.phone,
            "created_at": str(current_user.created_at.date())
        }
    }

@router.put("/me")
async def update_my_profile(
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if request.get("name"):
        current_user.name = request["name"]
    if request.get("phone"):
        current_user.phone = request["phone"]
    await db.commit()
    return {"code": 200, "message": "회원 정보가 수정되었습니다."}

@router.put("/me/password")
async def change_password(
    request: dict,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not verify_password(request.get("current_password", ""), current_user.password):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
    if request.get("new_password") != request.get("new_password_confirm"):
        raise HTTPException(status_code=400, detail="새 비밀번호가 일치하지 않습니다.")
    current_user.password = hash_password(request["new_password"])
    await db.commit()
    return {"code": 200, "message": "비밀번호가 변경되었습니다."}
