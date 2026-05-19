import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { getPets, type Pet } from "../../api/pets-api";
import GuardianNavbar from "../../components/guardian-navbar";

const petRegisterPath = "/pets/register";

const previewPets: Pet[] = [
  {
    pet_id: 1,
    petname: "뽀삐",
    species: "강아지",
    breed: "말티즈",
    age: 4,
    gender: "남아",
    profile_image: "/assets/profile1.png",
  },
  {
    pet_id: 2,
    petname: "두부",
    species: "강아지",
    breed: "말티즈",
    age: 4,
    gender: "남아",
    profile_image: "/assets/profile2.png",
  },
  {
    pet_id: 3,
    petname: "콩이",
    species: "강아지",
    breed: "말티즈",
    age: 4,
    gender: "남아",
    profile_image: "/assets/profile3.png",
  },
];

const defaultProfileImages = [
  "/assets/profile1.png",
  "/assets/profile2.png",
  "/assets/profile3.png",
  "/assets/profile4.png",
  "/assets/profile5.png",
  "/assets/profile6.png",
];

const normalizeGender = (gender?: string) => {
  if (!gender) {
    return undefined;
  }

  if (gender === "male") {
    return "남아";
  }

  if (gender === "female") {
    return "여아";
  }

  return gender;
};

const getPetMeta = (pet: Pet) =>
  [pet.breed || pet.species, pet.age ? `${pet.age}살` : undefined, normalizeGender(pet.gender)]
    .filter(Boolean)
    .join(" · ");

const getProfileImage = (pet: Pet) =>
  pet.profile_image ||
  defaultProfileImages[Math.abs(pet.pet_id) % defaultProfileImages.length];

const sortPetsByName = (petsToSort: Pet[]) =>
  [...petsToSort].sort((firstPet, secondPet) =>
    firstPet.petname.localeCompare(secondPet.petname, "ko"),
  );

const PetIllustration = () => (
  <img
    src="/assets/medi-paw-logo.png"
    alt="반려동물 등록 안내"
    className="mx-auto h-36 w-auto object-contain"
  />
);

const HomePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewMode = import.meta.env.DEV ? searchParams.get("preview") : null;
  const isEmptyPreview = previewMode === "empty";
  const isPetsPreview = previewMode === "pets";
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const hasPets = pets.length > 0;
  const petCountLabel = useMemo(() => `${pets.length}마리`, [pets.length]);

  useEffect(() => {
    if (isPetsPreview) {
      setIsLoading(false);
      setErrorMessage("");
      setPets(sortPetsByName(previewPets));
      return;
    }

    if (isEmptyPreview) {
      setIsLoading(false);
      setErrorMessage("");
      setPets([]);
      return;
    }

    let isMounted = true;

    const loadPets = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await getPets();
        if (!isMounted) {
          return;
        }

        if (response.code !== 200) {
          setErrorMessage(response.message || "반려동물 목록을 불러오지 못했습니다.");
          setPets([]);
          return;
        }

        if (response.result.length === 0) {
          navigate(petRegisterPath, { replace: true });
          return;
        }

        setPets(sortPetsByName(response.result));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isAxiosError<{ message?: string }>(error)) {
          setErrorMessage(
            error.response?.data?.message ||
              "반려동물 목록을 불러오지 못했습니다.",
          );
          return;
        }

        setErrorMessage("반려동물 목록을 불러오지 못했습니다.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPets();

    return () => {
      isMounted = false;
    };
  }, [isEmptyPreview, isPetsPreview, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <GuardianNavbar />

      <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6">
        {isLoading ? (
          <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          </section>
        ) : errorMessage ? (
          <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
            <div className="w-full max-w-md rounded-3xl bg-white px-6 py-10 text-center shadow-xl shadow-blue-100/60 ring-1 ring-blue-50">
              <h1 className="text-xl font-black text-slate-900">
                홈 화면을 불러오지 못했습니다
              </h1>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                다시 시도
              </button>
            </div>
          </section>
        ) : !hasPets ? (
          <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
            <div className="w-full max-w-xl rounded-3xl bg-white px-6 py-12 text-center shadow-xl shadow-blue-100/60 ring-1 ring-blue-50 sm:px-10">
              <PetIllustration />
              <h1 className="mt-6 text-2xl font-black text-slate-900">
                등록된 반려동물이 없어요
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-slate-500">
                반려동물을 등록하면 맞춤 상담과 예약 서비스를
                <br />
                더 편리하게 이용하실 수 있습니다.
              </p>

              <Link
                to={petRegisterPath}
                className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                + 반려동물 등록하기
              </Link>
            </div>
          </section>
        ) : (
          <section className="pb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-950">
                  내 반려동물
                </h1>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  사랑하는 반려동물의 건강을 관리하고 예약해보세요.
                </p>
              </div>

              <Link
                to={petRegisterPath}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
              >
                + 반려동물 등록
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 px-1 text-sm font-bold text-slate-500">
                등록된 반려동물 {petCountLabel}
              </div>

              <div className="space-y-4">
                {pets.map((pet) => (
                  <article
                    key={pet.pet_id}
                    className="rounded-xl border border-slate-100 bg-white p-4 transition hover:border-blue-100 hover:shadow-lg hover:shadow-blue-100/50 sm:flex sm:items-center sm:gap-6"
                  >
                    <div className="mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-full bg-slate-50 sm:mx-0">
                      <img
                        src={getProfileImage(pet)}
                        alt={`${pet.petname} 프로필`}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="mt-4 min-w-0 flex-1 text-center sm:mt-0 sm:text-left">
                      <h2 className="text-lg font-black text-slate-950">
                        {pet.petname}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {getPetMeta(pet) || pet.species || "반려동물"}
                      </p>

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="grid gap-2 sm:max-w-[620px] sm:grid-cols-3">
                          <Link
                            to={`/pets/${pet.pet_id}/edit`}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            정보 수정
                          </Link>
                          <Link
                            to={`/chatbot?petId=${pet.pet_id}`}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 px-4 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                          >
                            챗봇 예약
                          </Link>
                          <Link
                            to={`/reservations/new?petId=${pet.pet_id}`}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 px-4 text-sm font-bold text-emerald-600 transition hover:bg-emerald-50"
                          >
                            검진 / 바로 예약
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

          </section>
        )}
      </main>
    </div>
  );
};

export default HomePage;
