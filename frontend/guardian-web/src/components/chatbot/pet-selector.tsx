import { Link } from "react-router-dom";

import type { Pet } from "../../api/pets-api";

interface PetSelectorProps {
  pets: Pet[];
  selectedPetId: number | null;
  isLoadingPets: boolean;
  onSelectPet: (petId: number) => void;
  getProfileImage: (pet: Pet) => string;
}

const PetSelector = ({
  pets,
  selectedPetId,
  isLoadingPets,
  onSelectPet,
  getProfileImage,
}: PetSelectorProps) => {
  return (
    <aside className="flex min-h-0 flex-col border-b border-slate-100 bg-slate-50/70 lg:border-b-0 lg:border-r">
      <div className="flex h-14 shrink-0 items-center justify-center border-b border-slate-100 px-3">
        <h2 className="text-center text-sm font-black text-slate-900">
          반려동물
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-4">
        {isLoadingPets ? (
          <div className="mt-8 flex justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          </div>
        ) : pets.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-3 text-center ring-1 ring-slate-100">
            <p className="text-xs font-bold leading-5 text-slate-600">
              등록된 반려동물이 없습니다.
            </p>
            <Link
              to="/pets/register"
              className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
            >
              등록
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {pets.map((pet) => {
              const isSelected = pet.pet_id === selectedPetId;

              return (
                <button
                  key={pet.pet_id}
                  type="button"
                  onClick={() => onSelectPet(pet.pet_id)}
                  className={[
                    "flex w-full items-center gap-2 rounded-2xl border p-2 text-left transition",
                    isSelected
                      ? "border-blue-200 bg-blue-50 shadow-sm"
                      : "border-transparent bg-white hover:border-blue-100 hover:bg-blue-50/60",
                  ].join(" ")}
                >
                  <img
                    src={getProfileImage(pet)}
                    alt={`${pet.petname} 프로필`}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900">
                    {pet.petname}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default PetSelector;
