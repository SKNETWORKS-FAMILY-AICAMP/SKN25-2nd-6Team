import { Link } from "react-router-dom";

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            M
          </span>
          <div>
            <p className="text-base font-bold text-blue-700 sm:text-lg">MediPaw</p>
            <p className="hidden text-xs font-medium text-slate-500 sm:block">
              보호자 반려동물 상담 및 예약 보조 서비스
            </p>
          </div>
        </Link>

        <Link
          to="/signup"
          className="rounded-full border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
        >
          회원가입
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl items-center justify-center px-4 pb-10 pt-12 sm:px-6">
        <section className="w-full max-w-md rounded-3xl border border-blue-100 bg-white p-6 text-center shadow-xl shadow-blue-100/70">
          <p className="text-sm font-semibold text-blue-600">MediPaw guardian login</p>
          <h1 className="mt-3 text-2xl font-bold text-slate-950">로그인</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            로그인 화면은 준비 중입니다. 회원가입 완료 후 이동 경로 확인을 위한 임시
            페이지입니다.
          </p>
          <Link
            to="/signup"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
          >
            회원가입으로 돌아가기
          </Link>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
