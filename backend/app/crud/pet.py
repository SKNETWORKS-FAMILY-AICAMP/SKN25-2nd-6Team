from sqlalchemy.orm import Session
from app.models.pet import Pet
from app.schemas.pet import PetCreate, PetUpdate

# 반려동물 등록
def create_pet(db: Session, pet: PetCreate, userid: int):
    db_pet = Pet(
        userid=userid,
        petname=pet.petname,
        species=pet.species,
        breed=pet.breed,
        gender=pet.gender,
        is_neutered=True if pet.is_neutered == "예" else False if pet.is_neutered == "아니요" else None,
        birth_date=None if pet.is_birth_unknown else pet.birth_date,
        checkup_date=None if pet.is_checkup_unknown else pet.checkup_date,
        weight_kg=pet.weight_kg,
        notes=pet.notes,
        profile_image=pet.profile_image,
    )
    db.add(db_pet)
    db.commit()
    db.refresh(db_pet)
    return db_pet

# 반려동물 목록 조회
def get_pets_by_userid(db: Session, userid: int):
    return db.query(Pet).filter(Pet.userid == userid).all()

# 반려동물 상세 조회
def get_pet_by_id(db: Session, pet_id: int, userid: int):
    return db.query(Pet).filter(Pet.petid == pet_id, Pet.userid == userid).first()

# 반려동물 수정
def update_pet(db: Session, pet: Pet, pet_data: PetUpdate):
    if pet_data.petname is not None:
        pet.petname = pet_data.petname
    if pet_data.species is not None:
        pet.species = pet_data.species
    if pet_data.breed is not None:
        pet.breed = pet_data.breed
    if pet_data.gender is not None:
        pet.gender = pet_data.gender
    if pet_data.is_neutered is not None:
        pet.is_neutered = True if pet_data.is_neutered == "예" else False if pet_data.is_neutered == "아니요" else None
    if pet_data.is_birth_unknown == True:
        pet.birth_date = None
    if pet_data.is_checkup_unknown == True:
        pet.checkup_date = None
    elif pet_data.checkup_date is not None:
        pet.checkup_date = pet_data.checkup_date
    elif pet_data.birth_date is not None:
        pet.birth_date = pet_data.birth_date
    if pet_data.weight_kg is not None:
        pet.weight_kg = pet_data.weight_kg
    if pet_data.notes is not None:
        pet.notes = pet_data.notes
    if pet_data.profile_image is not None:
        pet.profile_image = pet_data.profile_image

    db.commit()
    db.refresh(pet)
    return pet

# 반려동물 삭제
def delete_pet(db: Session, pet: Pet):
    db.delete(pet)
    db.commit()