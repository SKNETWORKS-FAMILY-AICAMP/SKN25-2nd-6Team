from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.pet import PetCreate, PetListResponse, PetDetailResponse, PetUpdate
from app.crud.pet import create_pet, get_pets_by_userid, get_pet_by_id, update_pet, delete_pet
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/pets", tags=["pets"])

# 반려동물 목록 조회
@router.get("", status_code=200)
async def get_pets(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    pets = await get_pets_by_userid(db, current_user.userid)
    return {
        "code": 200,
        "result": [
            {
                "pet_id": pet.petid,
                "petname": pet.petname,
                "species": pet.species,
                "breed": pet.breed,
                "gender": pet.gender,
                "profile_image": pet.profile_image
            }
            for pet in pets
        ]
    }

# 반려동물 등록
@router.post("", status_code=201)
async def register_pet(
    pet: PetCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if not pet.petname:
        raise HTTPException(status_code=400, detail="반려동물 이름을 입력해주세요.")
    if not pet.species:
        raise HTTPException(status_code=400, detail="종을 선택해주세요.")

    new_pet = await create_pet(db, pet, current_user.userid)
    return {
        "code": 201,
        "message": "반려동물이 등록되었습니다.",
        "result": {"pet_id": new_pet.petid}
    }

# 반려동물 상세 조회
@router.get("/{pet_id}", status_code=200)
async def get_pet(
    pet_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    pet = await get_pet_by_id(db, pet_id, current_user.userid)
    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")
    return {
        "code": 200,
        "result": {
            "pet_id": pet.petid,
            "petname": pet.petname,
            "species": pet.species,
            "breed": pet.breed,
            "gender": pet.gender,
            "is_neutered": "예" if pet.is_neutered == True else "아니오" if pet.is_neutered == False else "모름",
            "birth_date": str(pet.birth_date) if pet.birth_date else None,
            "is_birth_unknown": pet.birth_date is None,
            "weight_kg": float(pet.weight_kg) if pet.weight_kg else None,
            "checkup_date": str(pet.checkup_date) if pet.checkup_date else None,
            "is_checkup_unknown": pet.checkup_date is None,
            "notes": pet.notes,
            "profile_image": pet.profile_image
        }
    }

# 반려동물 수정
@router.put("/{pet_id}", status_code=200)
async def modify_pet(
    pet_id: int,
    pet_data: PetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    pet = await get_pet_by_id(db, pet_id, current_user.userid)
    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")
    if pet.userid != current_user.userid:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다.")

    await update_pet(db, pet, pet_data)
    return {"code": 200, "message": "반려동물 정보가 수정되었습니다."}

# 반려동물 삭제
@router.delete("/{pet_id}", status_code=200)
async def remove_pet(
    pet_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    pet = await get_pet_by_id(db, pet_id, current_user.userid)
    if not pet:
        raise HTTPException(status_code=404, detail="반려동물 정보를 찾을 수 없습니다.")

    await delete_pet(db, pet)
    return {"code": 200, "message": "반려동물이 삭제되었습니다."}
