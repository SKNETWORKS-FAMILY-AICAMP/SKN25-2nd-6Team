import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";

import { getPets, type Pet } from "../../api/pets-api";
import { useAuthStore } from "../../stores/auth-store";

const navItems = [
  { label: "홈", to: "/home" },
  { label: "예약 내역", to: "/reservations" },
  { label: "챗봇 상담", to: "/chatbot" },
  { label: "마이페이지", to: "/mypage" },
];

const petRegisterPath = "/pets/register";

const getPetMeta = (pet: Pet) =>
  [pet.breed, pet.age ? `${pet.age}살` : undefined, pet.gender]
    .filter(Boolean)
    .join(" · ");

const PetIllustration = () => (
  <div className="relative mx-auto h-40 w-64">
    <div className="absolute bottom-4 left-8 h-24 w-28 rounded-t-[2rem] bg-blue-100/80" />
    <div className="absolute bottom-4 left-14 h-12 w-12 rounded-full bg-blue-200/70" />
    <div className="absolute bottom-4 right-4 h-9 w-9 rounded-full bg-blue-100 text-center text-xl leading-9 text-blue-500">
      ♥
    </div>

    <div className="absolute bottom-2 left-20 h-28 w-24">
      <div className="absolute left-3 top-3 h-8 w-5 -rotate-12 rounded-full bg-amber-100" />
      <div className="absolute right-3 top-3 h-8 w-5 rotate-12 rounded-full bg-amber-100" />
      <div className="absolute left-4 top-5 h-20 w-16 rounded-full bg-white shadow-lg shadow-blue-100" />
      <div className="absolute left-8 top-12 h-2 w-2 rounded-full bg-slate-800" />
      <div className="absolute right-8 top-12 h-2 w-2 rounded-full bg-slate-800" />
      <div className="absolute left-[2.55rem] top-[3.7rem] h-2 w-3 rounded-full bg-slate-800" />
      <div className="absolute left-8 top-[4.35rem] h-3 w-8 rounded-b-full border-b border-slate-400" />
      <div className="absolute bottom-0 left-2 h-12 w-20 rounded-3xl bg-amber-50 shadow-lg shadow-blue-100" />
    </div>

    <div className="absolute bottom-2 right-16 h-24 w-20">
      <div className="absolute left-4 top-0 h-9 w-7 -rotate-12 rounded-t-full bg-slate-500" />
      <div className="absolute right-4 top-0 h-9 w-7 rotate-12 rounded-t-full bg-slate-500" />
      <div className="absolute left-3 top-5 h-16 w-14 rounded-full bg-slate-100 shadow-lg shadow-blue-100" />
      <div className="absolute left-6 top-10 h-2 w-2 rounded-full bg-slate-800" />
      <div className="absolute right-6 top-10 h-2 w-2 rounded-full bg-slate-800" />
      <div className="absolute left-[2.1rem] top-[3rem] h-2 w-3 rounded-full bg-pink-300" />
      <div className="absolute bottom-0 left-1 h-11 w-16 rounded-3xl bg-slate-500" />
      <div className="absolute bottom-8 right-0 h-10 w-3 rotate-12 rounded-full bg-slate-500" />
    </div>
  </div>
);

const Header = () => {
  const guardian = useAuthStore((state) => state.guardian);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const displayName = guardian?.name || guardian?.loginid || "보호자";

  return (
    <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/home" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
            MP
          </span>
          <span className="text-lg font-black text-blue-600">MediPaw</span>
        </Link>

        <nav className="hidden h-full items-center gap-8 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex h-full items-center border-b-2 px-1 text-sm font-bold transition",
                  isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-700 hover:text-blue-600",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full px-2 py-1 transition hover:bg-slate-50">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-600">
                {displayName.slice(0, 1)}
              </span>
              <span className="hidden max-w-24 truncate text-sm font-bold text-slate-700 sm:block">
                {displayName}님
              </span>
              <span className="text-xs text-slate-400">v</span>
            </summary>
            <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-slate-100 bg-white p-2 text-sm font-semibold shadow-xl shadow-slate-200/80">
              <Link
                to="/mypage"
                className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
              >
                계정 관리
              </Link>
              <Link
                to="/login"
                onClick={clearAuth}
                className="block rounded-xl px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
              >
                로그아웃
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEmptyPreview = searchParams.get("preview") === "empty";
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const hasPets = pets.length > 0;
  const petCountLabel = useMemo(() => `${pets.length}마리`, [pets.length]);

  useEffect(() => {
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

        setPets(response.result);
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
  }, [isEmptyPreview, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {isLoading ? (
          <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          </section>
        ) : errorMessage ? (
          <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
            <div className="w-full max-w-md rounded-3xl bg-white px-6 py-10 text-center shadow-xl shadow-blue-100/60 ring-1 ring-blue-50">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-xl font-black text-red-500">
                !
              </div>
              <h1 className="mt-5 text-xl font-black text-slate-900">
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
          <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-950">내 반려동물</h1>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  사랑하는 반려동물의 건강을 관리하고 예약해보세요.
                </p>
              </div>

              <Link
                to={petRegisterPath}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
              >
                + 반려동물 등록
              </Link>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-bold text-slate-500">
                등록된 반려동물 {petCountLabel}
              </div>

              <div className="space-y-4">
                {pets.map((pet) => (
                  <article
                    key={pet.pet_id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-blue-100 hover:shadow-lg hover:shadow-blue-100/50 sm:flex sm:items-center sm:gap-6"
                  >
                    <div className="mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-full bg-blue-50 sm:mx-0">
                      {pet.profile_image ? (
                        <img
                          src={pet.profile_image}
                          alt={`${pet.petname} 프로필`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-blue-500">
                          {pet.species === "고양이" ? "CAT" : "DOG"}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 min-w-0 flex-1 text-center sm:mt-0 sm:text-left">
                      <h2 className="text-lg font-black text-slate-950">
                        {pet.petname}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {getPetMeta(pet) || pet.species || "반려동물"}
                      </p>

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <Link
                            to={`/pets/${pet.pet_id}`}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            상세 보기
                          </Link>
                          <Link
                            to={`/chatbot?petId=${pet.pet_id}`}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-200 px-4 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
                          >
                            챗봇 예약
                          </Link>
                          <Link
                            to={`/reservations/new?petId=${pet.pet_id}`}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 px-4 text-sm font-bold text-emerald-600 transition hover:bg-emerald-50"
                          >
                            검진 / 예약
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
