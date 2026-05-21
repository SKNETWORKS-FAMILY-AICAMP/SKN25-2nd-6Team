import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { PatientProfile } from "../../types/patient";
import { speciesOptions } from "../../utils/patientUtils";
import { EmptyState } from "../common/EmptyState";

interface PatientListViewProps {
  searchValue: string;
  selectedSpecies: string;
  currentPage: number;
  totalCount: number;
  totalPages: number;
  isLoading: boolean;
  patients: PatientProfile[];
  onSearch: (value: string) => void;
  onChangeSpecies: (value: string) => void;
  onChangePage: (page: number) => void;
  onOpenDetail: (patient: PatientProfile) => void;
}

export function PatientListView({
  searchValue,
  selectedSpecies,
  currentPage,
  totalCount,
  totalPages,
  isLoading,
  patients,
  onSearch,
  onChangeSpecies,
  onChangePage,
  onOpenDetail,
}: PatientListViewProps) {
  return (
    <div className="flex h-[calc(100vh-72px)] flex-col overflow-hidden bg-[#f7f9fc] px-6 py-4">
      <div className="mb-3 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#151b28]">환자 관리</h1>
          <p className="mt-2 text-sm font-bold text-[#65718a]">
            병원 전체 환자 리스트를 확인하고 관리할 수 있습니다.
          </p>
        </div>

        <label className="relative w-[420px] max-w-full">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748b]" />
          <input
            value={searchValue}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="강아지 이름 또는 보호자 이름 검색"
            className="h-12 w-full rounded-lg border border-[#dfe6f1] bg-white pl-12 pr-4 text-sm font-bold text-[#1d2a57] outline-none transition placeholder:text-[#9aa5b8] focus:border-[#8bbcff] focus:ring-2 focus:ring-[#e6f1ff]"
          />
        </label>
      </div>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#e5eaf2] bg-white shadow-sm">
        <div className="flex h-[64px] shrink-0 items-center justify-between border-b border-[#e5eaf2] px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-[#151b28]">전체 환자</h2>
            <span className="rounded-full bg-[#edf5ff] px-2.5 py-1 text-sm font-extrabold text-[#2f7df6]">
              {totalCount}
            </span>
          </div>

          <select
            value={selectedSpecies}
            onChange={(event) => onChangeSpecies(event.target.value)}
            className="h-11 min-w-[150px] rounded-lg border border-[#dfe6f1] bg-white px-4 text-sm font-extrabold text-[#4d5874] outline-none"
          >
            <option value="all">전체</option>
            {speciesOptions.map((species) => (
              <option key={species} value={species}>
                {species}
              </option>
            ))}
          </select>
        </div>

        {patients.length === 0 ? (
          <EmptyState
            text={searchValue.trim() ? "검색 결과가 없습니다." : "환자가 없습니다."}
          />
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="bg-[#f8fafd]">
                  <tr className="border-b border-[#e5eaf2] text-xs font-extrabold uppercase tracking-wide text-[#8595ae]">
                    <th className="w-[11%] px-6 py-3.5">이름</th>
                    <th className="w-[11%] px-4 py-3.5">나이</th>
                    <th className="w-[12%] px-4 py-3.5">보호자</th>
                    <th className="w-[15%] px-4 py-3.5">전화번호</th>
                    <th className="w-[14%] px-4 py-3.5">품종</th>
                    <th className="w-[13%] px-4 py-3.5">최근 내원일</th>
                    <th className="px-4 py-3.5">메모</th>
                    <th className="w-[112px] px-6 py-3.5 text-right" aria-label="상세보기" />
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => !isLoading && onOpenDetail(patient)}
                      className="group h-[56px] cursor-pointer border-b border-[#edf1f6] text-sm text-[#33415f] last:border-b-0 transition-colors hover:bg-[#eef5ff]"
                    >
                      <td className="px-6 py-3 font-extrabold text-[#1d2a57]">
                        {patient.petName}
                      </td>
                      <td className="px-4 py-3 text-[#52607a]">{patient.age}</td>
                      <td className="px-4 py-3 font-semibold">{patient.guardianName}</td>
                      <td className="px-4 py-3 tabular-nums text-[#52607a]">{patient.phone}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-md bg-[#f0f4fa] px-2 py-0.5 text-xs font-extrabold text-[#4d5874]">
                          {patient.breed}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[#52607a]">{patient.lastVisitDate}</td>
                      <td className="truncate px-4 py-3 text-[#8595ae]">{patient.memo}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenDetail(patient);
                          }}
                          disabled={isLoading}
                          className="h-9 whitespace-nowrap rounded-lg border border-[#a8cbff] bg-white px-4 text-sm font-extrabold text-[#2f7df6] transition hover:bg-[#edf5ff] disabled:cursor-wait disabled:opacity-60"
                        >
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onChangePage={onChangePage}
            />
          </>
        )}
      </section>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onChangePage,
}: {
  currentPage: number;
  totalPages: number;
  onChangePage: (page: number) => void;
}) {
  const pages: Array<number | "..."> =
    totalPages <= 7
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : [1, 2, 3, 4, 5, "...", totalPages];

  return (
    <div className="flex h-[56px] shrink-0 items-center justify-center gap-2 border-t border-[#edf1f6] px-6">
      <button
        type="button"
        onClick={() => onChangePage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dfe6f1] text-[#53617c] disabled:opacity-40"
        aria-label="이전 페이지"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((page) =>
        page === "..." ? (
          <span
            key="ellipsis"
            className="flex h-9 w-9 items-center justify-center text-sm font-extrabold text-[#53617c]"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => onChangePage(page)}
            className={[
              "h-9 w-9 rounded-lg text-sm font-extrabold",
              page === currentPage
                ? "bg-[#edf5ff] text-[#0f62fe]"
                : "text-[#53617c] hover:bg-[#f3f6fb]",
            ].join(" ")}
          >
            {page}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChangePage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dfe6f1] text-[#53617c] disabled:opacity-40"
        aria-label="다음 페이지"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
