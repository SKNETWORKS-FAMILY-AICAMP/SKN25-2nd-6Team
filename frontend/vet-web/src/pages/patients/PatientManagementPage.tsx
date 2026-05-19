import React, { useEffect, useState } from "react";

import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  X,
} from "lucide-react";

import { AuthSession } from "../../api/authApi";

import {
  fetchDoctorPatientDetail,
  fetchDoctorPatientList,
  updatePatient,
  PatientDetailResponse,
  PatientListItemResponse,
  PatientUpdatePayload,
} from "../../api/patientApi";

import AppLayout, { AppMenuId } from "../../layouts/AppLayout";

import {
  EmrHistoryRecord,
  PatientProfile,
} from "./patientsMockData";

interface PatientManagementPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNavigate: (menuId: AppMenuId) => void;
}

const speciesOptions = ["강아지", "고양이"];

function normalizeDate(value: string) {
  return value.replace(/-/g, ".");
}

function mapListItemToPatient(item: PatientListItemResponse): PatientProfile {
  return {
    id: item.petid,
    petName: item.petname,
    species: "강아지",
    breed: item.breed,
    age: item.age,
    guardianName: item.owner_name,
    phone: item.phone,
    lastVisitDate: normalizeDate(item.last_visit_date),
    memo: item.memo,
    imageUrl:
      "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "-",
    guardianAddress: "-",
    guardianMemo: item.memo || "-",
    gender: "-",
    isNeutered: false,
    birthDate: "-",
    weight: "-",
    weightMeasuredAt: "-",
    notes: item.memo || "-",
  };
}

function mapDetailToPatient(
  detail: PatientDetailResponse["result"]
): PatientProfile {
  const info = detail.patient_info;

  return {
    id: info.petid,
    petName: info.petname,
    species: info.species === "고양이" ? "고양이" : "강아지",
    breed: info.breed,
    age: info.age,
    guardianName: info.owner_name,
    phone: info.phone,
    lastVisitDate: detail.emr_history[0]?.visit_date
      ? normalizeDate(detail.emr_history[0].visit_date)
      : "-",
    memo: info.notes,
    imageUrl:
      info.profile_image ||
      "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "-",
    guardianAddress: info.address,
    guardianMemo: info.notes,
    gender: info.gender === "female" ? "암컷" : info.gender === "male" ? "수컷" : info.gender,
    isNeutered: Boolean(info.is_neutered),
    birthDate: normalizeDate(info.birth_date),
    weight: `${info.weight_kg}kg`,
    weightMeasuredAt: detail.emr_history[0]?.visit_date
      ? normalizeDate(detail.emr_history[0].visit_date)
      : "-",
    notes: info.notes,
  };
}

function mapDetailToHistory(
  detail: PatientDetailResponse["result"]
): EmrHistoryRecord[] {
  return detail.emr_history.map((record) => ({
    id: record.doctor_emrid,
    date: normalizeDate(record.visit_date),
    type: record.status === "vaccination" ? "prevention" : "treatment",
    doctorName: record.doctor_name,
    title: record.chief_complaint,
    soap: {
      subjective: record.soap.subjective,
      objective: record.soap.objective,
      assessment: record.soap.assessment,
      plan: record.soap.plan,
    },
    prescriptions: record.prescription.map((line) => ({
      name: line.drug_name,
      dose: line.dosage,
      method: line.frequency,
      duration: `${line.duration_days}일분`,
    })),
  }));
}

export default function PatientManagementPage({
  session,
  onLogout,
  onNavigate,
}: PatientManagementPageProps) {
  const [searchValue, setSearchValue] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagePatients, setPagePatients] = useState<PatientProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<EmrHistoryRecord[]>([]);
  const [listRefreshKey, setListRefreshKey] = useState(0);


  useEffect(() => {
    let isMounted = true;

    const loadPatients = async () => {
      setIsLoading(true);
      try {
        const result = await fetchDoctorPatientList({
          accessToken: session.accessToken,
          page: currentPage,
          keyword: searchValue.trim(),
          species: selectedSpecies === "all" ? undefined : selectedSpecies,
        });

        if (!isMounted) {
          return;
        }

        setPagePatients(result.patient_list.map(mapListItemToPatient));
        setTotalCount(result.total_count ?? result.patient_list.length);
        setTotalPages(result.pagination?.total_page ?? 1);
      } catch (error) {
        console.error(error)

        setPagePatients([])
        setTotalCount(0)
        setTotalPages(1)
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPatients();

    return () => {
      isMounted = false;
    };
  }, [currentPage, searchValue, selectedSpecies, session.accessToken, listRefreshKey]);
  const updateSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const updateSpecies = (value: string) => {
    setSelectedSpecies(value);
    setCurrentPage(1);
  };

  const handleOpenDetail = async (patient: PatientProfile) => {
    try {
      const detail = await fetchDoctorPatientDetail({
        accessToken: session.accessToken,
        petid: patient.id,
      });

      setSelectedPatient(mapDetailToPatient(detail));
      setSelectedHistory(mapDetailToHistory(detail));
    } catch (error) {
      console.error("환자 상세 조회 실패:", error);
    }
  };

  if (selectedPatient) {
    return (
      <AppLayout
        session={session}
        activeMenu="patients"
        notificationCount={1}
        onLogout={onLogout}
        onNavigate={onNavigate}
      >
        <PatientDetailView
          accessToken={session.accessToken}
          patient={selectedPatient}
          history={selectedHistory}
          onBack={() => {
            setSelectedPatient(null);
            setSelectedHistory([]);
          }}
          onSaved={(updated) => {
            setSelectedPatient(updated);
            setListRefreshKey((prev) => prev + 1);
          }}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      session={session}
      activeMenu="patients"
      notificationCount={1}
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
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
              onChange={(event) => updateSearch(event.target.value)}
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
              onChange={(event) => updateSpecies(event.target.value)}
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

          {pagePatients.length === 0 ? (
            <EmptyState
              text={
                searchValue.trim()
                  ? "검색 결과가 없습니다."
                  : "환자가 없습니다."
              }
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
                    {pagePatients.map((patient) => (
                      <tr
                        key={patient.id}
                        onClick={() => !isLoading && handleOpenDetail(patient)}
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
                              handleOpenDetail(patient);
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
                onChangePage={setCurrentPage}
              />
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-sm font-extrabold text-[#7a8599]">
      {text}
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

function PatientDetailView({
  accessToken,
  patient,
  history,
  onBack,
  onSaved,
}: {
  accessToken: string;
  patient: PatientProfile;
  history: EmrHistoryRecord[];
  onBack: () => void;
  onSaved: (updated: PatientProfile) => void;
}) {
  const [localPatient, setLocalPatient] = useState(patient);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(patient);
  const [isSaving, setIsSaving] = useState(false);

  const openEdit = () => {
    setDraft(localPatient);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    const payload: PatientUpdatePayload = {
      petname: draft.petName,
      species: draft.species,
      breed: draft.breed,
      gender:
        draft.gender === "수컷"
          ? "male"
          : draft.gender === "암컷"
          ? "female"
          : undefined,
      is_neutered: draft.isNeutered,
      birth_date:
        draft.birthDate && draft.birthDate !== "-"
          ? draft.birthDate.replace(/\./g, "-")
          : undefined,
      weight_kg: (() => {
        const parsed = parseFloat(draft.weight);
        return Number.isFinite(parsed) ? parsed : undefined;
      })(),
      notes: draft.notes,
    };

    setIsSaving(true);
    try {
      await updatePatient({
        accessToken,
        petid: localPatient.id,
        payload,
      });

      setLocalPatient(draft);
      onSaved(draft);
      setIsEditing(false);
    } catch (error) {
      console.error("환자 수정 실패:", error);
      alert("환자 정보 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = (field: keyof PatientProfile, value: string | boolean) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-[calc(100vh-72px)] flex-col bg-[#f7f9fc] px-6 py-4">
      {isEditing && (
        <EditPatientModal
          draft={draft}
          isSaving={isSaving}
          onChange={updateDraft}
          onSave={saveEdit}
          onCancel={() => setIsEditing(false)}
        />
      )}

      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 items-center gap-2 rounded-lg border border-[#dfe6f1] bg-white px-4 text-sm font-extrabold text-[#344055] transition hover:border-[#8bbcff] hover:text-[#0f62fe]"
        >
          <ArrowLeft className="h-4 w-4" />
          환자 관리로 돌아가기
        </button>
        <button
          type="button"
          onClick={openEdit}
          className="flex h-10 items-center gap-2 rounded-lg border border-[#a8cbff] bg-white px-4 text-sm font-extrabold text-[#2f7df6] transition hover:bg-[#edf5ff]"
        >
          <Settings className="h-4 w-4" />
          수정
        </button>
      </div>

      <h1 className="mb-4 text-2xl font-extrabold text-[#151b28]">
        {localPatient.petName} <span className="text-[#40506d]">({localPatient.breed})</span>
      </h1>

      <section className="grid grid-cols-[180px_1fr_1fr] gap-6 rounded-lg border border-[#e5eaf2] bg-white p-6 shadow-sm">
        <img
          src={localPatient.imageUrl}
          alt={`${localPatient.petName} 프로필`}
          className="h-40 w-40 rounded-lg object-cover"
        />

        <InfoGrid
          rows={[
            ["보호자 이름", localPatient.guardianName],
            ["전화번호", localPatient.phone],
            ["이메일", localPatient.guardianEmail],
            ["주소", localPatient.guardianAddress],
            ["메모", localPatient.guardianMemo],
          ]}
        />

        <InfoGrid
          rows={[
            ["품종", localPatient.breed],
            ["성별", `${localPatient.gender} / 중성화 ${localPatient.isNeutered ? "O" : "X"}`],
            ["생년월일", `${localPatient.birthDate} (${localPatient.age})`],
            ["체중", `${localPatient.weight} (${localPatient.weightMeasuredAt} 기준)`],
            ["특이사항", localPatient.notes],
          ]}
        />
      </section>

      <section className="mt-4 flex-1 rounded-lg border border-[#e5eaf2] bg-white shadow-sm">
        <div className="border-b border-[#e5eaf2] px-6 py-4">
          <h2 className="text-lg font-extrabold text-[#151b28]">EMR 진료 기록</h2>
        </div>
        {history.length === 0 ? (
          <EmptyState text="등록된 진료 기록이 없습니다." />
        ) : (
          <div className="divide-y divide-[#edf1f6]">
            {history
              .slice()
              .sort((left, right) => right.date.localeCompare(left.date))
              .map((record) => (
                <EmrHistoryRow key={record.id} record={record} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-extrabold text-[#52607a]">{label}</dt>
          <dd className="font-bold leading-6 text-[#1d2a57]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EmrHistoryRow({ record }: { record: EmrHistoryRecord }) {
  const typeMeta =
    record.type === "treatment"
      ? { label: "진료", className: "bg-[#edf4ff] text-[#4b76c8]" }
      : { label: "예방", className: "bg-[#edf8f1] text-[#4b9a66]" };

  const soapRows = [
    ["S", "주관적", record.soap.subjective],
    ["O", "객관적", record.soap.objective],
    ["A", "평가", record.soap.assessment],
    ["P", "계획", record.soap.plan],
  ].filter(([, , value]) => Boolean(value));

  return (
    <article className="grid grid-cols-[150px_minmax(360px,1fr)_minmax(300px,0.9fr)] gap-6 px-6 py-5">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-extrabold tabular-nums text-[#1d2a57]">
            {record.date}
          </p>
          <span className={`rounded-md px-2.5 py-1 text-xs font-extrabold ${typeMeta.className}`}>
            {typeMeta.label}
          </span>
        </div>
        <p className="mt-3 text-sm font-bold text-[#52607a]">{record.doctorName}</p>
      </div>

      <div>
        <p className="text-xs font-extrabold text-[#7a8599]">의사 소견</p>
        <h3 className="mt-1 text-lg font-extrabold text-[#151b28]">{record.title}</h3>
        <dl className="mt-3 space-y-2 text-sm">
          {soapRows.map(([key, label, value]) => (
            <div key={key} className="grid grid-cols-[26px_58px_1fr] gap-2">
              <dt className="font-extrabold text-[#1d2a57]">{key}</dt>
              <dd className="font-extrabold text-[#52607a]">({label})</dd>
              <dd className="font-bold leading-6 text-[#344055]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-l border-[#edf1f6] pl-6">
        <p className="text-xs font-extrabold text-[#7a8599]">
          {record.type === "prevention" ? "처방/처치" : "처방 내역"}
        </p>
        {record.prescriptions.length === 0 ? (
          <p className="mt-4 text-sm font-bold text-[#7a8599]">처방 내역 없음</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {record.prescriptions.map((line, index) => (
              <li
                key={`${record.id}-${line.name}`}
                className="grid grid-cols-[24px_1fr_72px_60px] gap-3 text-sm font-bold text-[#344055]"
              >
                <span>{index + 1}.</span>
                <span>{line.name}</span>
                <span className="text-[#1d2a57]">{line.method}</span>
                <span>{line.duration}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  );
}

function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-extrabold text-[#52607a]">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-[#dfe6f1] bg-white px-3 text-sm font-bold text-[#1d2a57] outline-none transition focus:border-[#8bbcff] focus:ring-2 focus:ring-[#e6f1ff]";
const selectCls =
  "h-10 w-full rounded-lg border border-[#dfe6f1] bg-white px-3 text-sm font-bold text-[#1d2a57] outline-none transition focus:border-[#8bbcff] focus:ring-2 focus:ring-[#e6f1ff]";
const textareaCls =
  "w-full rounded-lg border border-[#dfe6f1] bg-white px-3 py-2 text-sm font-bold text-[#1d2a57] outline-none transition focus:border-[#8bbcff] focus:ring-2 focus:ring-[#e6f1ff] resize-none";

function EditPatientModal({
  draft,
  isSaving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: PatientProfile;
  isSaving: boolean;
  onChange: (field: keyof PatientProfile, value: string | boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-[680px] flex-col rounded-2xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#e5eaf2] px-6 py-4">
          <h2 className="text-lg font-extrabold text-[#151b28]">환자 정보 수정</h2>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8595ae] transition hover:bg-[#f0f4fa] hover:text-[#344055]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 반려동물 정보 */}
          <section>
            <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-[#8595ae]">
              반려동물 정보
            </p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="이름">
                <input
                  className={inputCls}
                  value={draft.petName}
                  onChange={(e) => onChange("petName", e.target.value)}
                />
              </FormField>
              <FormField label="품종">
                <input
                  className={inputCls}
                  value={draft.breed}
                  onChange={(e) => onChange("breed", e.target.value)}
                />
              </FormField>
              <FormField label="종류">
                <select
                  className={selectCls}
                  value={draft.species}
                  onChange={(e) => onChange("species", e.target.value)}
                >
                  <option value="강아지">강아지</option>
                  <option value="고양이">고양이</option>
                </select>
              </FormField>
              <FormField label="성별">
                <select
                  className={selectCls}
                  value={draft.gender}
                  onChange={(e) => onChange("gender", e.target.value)}
                >
                  <option value="수컷">수컷</option>
                  <option value="암컷">암컷</option>
                  <option value="-">미확인</option>
                </select>
              </FormField>
              <FormField label="중성화">
                <select
                  className={selectCls}
                  value={draft.isNeutered ? "true" : "false"}
                  onChange={(e) => onChange("isNeutered", e.target.value === "true")}
                >
                  <option value="true">O</option>
                  <option value="false">X</option>
                </select>
              </FormField>
              <FormField label="생년월일">
                <input
                  className={inputCls}
                  value={draft.birthDate}
                  onChange={(e) => onChange("birthDate", e.target.value)}
                />
              </FormField>
              <FormField label="체중">
                <input
                  className={inputCls}
                  value={draft.weight}
                  onChange={(e) => onChange("weight", e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="특이사항" className="mt-4">
              <textarea
                className={textareaCls}
                rows={2}
                value={draft.notes}
                onChange={(e) => onChange("notes", e.target.value)}
              />
            </FormField>
          </section>

          {/* EMR 수정 불가 안내 */}
          <div className="rounded-lg bg-[#fff8ec] border border-[#ffe4a0] px-4 py-3 text-xs font-bold text-[#a06a00]">
            EMR 진료 기록은 수정할 수 없습니다.
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-[#e5eaf2] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="h-10 rounded-lg border border-[#dfe6f1] px-5 text-sm font-extrabold text-[#52607a] transition hover:bg-[#f0f4fa] disabled:cursor-not-allowed disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="h-10 rounded-lg bg-[#2f7df6] px-5 text-sm font-extrabold text-white transition hover:bg-[#1a6de8] disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
