import { Link } from "react-router-dom";

const PetRegisterPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <main className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-xl shadow-blue-100/60 ring-1 ring-blue-50">
        <p className="text-sm font-bold text-blue-600">MediPaw</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">
          반려동물 등록
        </h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
          반려동물 등록 화면은 다음 단계에서 입력 폼과 API를 연결하면 됩니다.
        </p>
        <Link
          to="/home"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-blue-200 px-5 text-sm font-bold text-blue-600 transition hover:bg-blue-50"
        >
          홈으로 돌아가기
        </Link>
      </main>
    </div>
  );
};

export default PetRegisterPage;
