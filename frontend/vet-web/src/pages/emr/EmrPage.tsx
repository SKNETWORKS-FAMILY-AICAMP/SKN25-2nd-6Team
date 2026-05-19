import { useMemo, useState } from "react";
import {
  AlignLeft,
  Bold,
  Edit3,
  FileUp,
  Italic,
  List,
  Maximize2,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import { AuthSession } from "../../api/authApi";
import AppLayout, { AppMenuId } from "../../layouts/AppLayout";
import {
  createMockPrescriptionDocument,
  EmrResult,
  mockAutoPrescriptions,
  mockCompletedQueue,
  mockEmrResponsesByScheduleId,
  mockUploadedFiles,
  mockWaitingQueue,
  PetInfo,
  Prescription,
  PrescriptionDocumentResponse,
  QueuePatient,
  TriageStatus,
  UploadedFile,
} from "./emrMockData";

interface EmrPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNavigate: (menuId: AppMenuId) => void;
}

type QueueTab = "waiting" | "completed";

const statusStyle: Record<TriageStatus, { label: string; className: string }> = {
  emergency: {
    label: "응급",
    className: "bg-[#fff1f2] text-[#ef4444] border-[#fecdd3]",
  },
  semiEmergency: {
    label: "준응급",
    className: "bg-[#fff7ed] text-[#f97316] border-[#fed7aa]",
  },
  normal: {
    label: "일반",
    className: "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]",
  },
};

export default function EmrPage({ session, onLogout, onNavigate }: EmrPageProps) {
  const [queueTab, setQueueTab] = useState<QueueTab>("waiting");
  const [waitingQueue, setWaitingQueue] = useState(mockWaitingQueue);
  const [completedQueue, setCompletedQueue] = useState(mockCompletedQueue);
  const [selectedScheduleId, setSelectedScheduleId] = useState(
    mockWaitingQueue[0]?.schedule_id
  );
  const [editorValue, setEditorValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState(mockUploadedFiles);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isAutoPanelOpen, setIsAutoPanelOpen] = useState(true);
  const [isPrescriptionPreviewOpen, setIsPrescriptionPreviewOpen] =
    useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    label: string;
  } | null>(null);
  const [lastRefreshText, setLastRefreshText] = useState("방금 전");

  const currentQueue = queueTab === "waiting" ? waitingQueue : completedQueue;
  const currentEmr =
    selectedScheduleId !== undefined
      ? mockEmrResponsesByScheduleId[selectedScheduleId]?.result
      : undefined;
  const editorLength = editorValue.length;
  const currentAttachments = currentEmr?.triage_summary.attachments ?? [];
  const visibleGuardianFiles = currentAttachments.slice(0, 4);
  const hiddenGuardianFileCount = Math.max(currentAttachments.length - 4, 0);

  const completedCount = completedQueue.length;

  const queueTitle = useMemo(
    () =>
      queueTab === "waiting"
        ? `오늘 ${waitingQueue.length}건 대기 중`
        : `오늘 ${completedCount}건 진료 완료`,
    [completedCount, queueTab, waitingQueue.length]
  );

  const handleRefreshQueue = () => {
    setLastRefreshText(new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    }));
  };

  const handleCompleteVisit = () => {
    if (selectedScheduleId === undefined) {
      return;
    }

    const targetPatient = waitingQueue.find(
      (patient) => patient.schedule_id === selectedScheduleId
    );

    if (!targetPatient) {
      return;
    }

    const nextWaitingQueue = waitingQueue.filter(
      (patient) => patient.schedule_id !== selectedScheduleId
    );
    const nextPatient = nextWaitingQueue[0];

    setWaitingQueue(nextWaitingQueue);
    setCompletedQueue((prev) => [targetPatient, ...prev]);
    setSelectedScheduleId(nextPatient?.schedule_id);
    setEditorValue("");
    setPrescriptions([]);
    setUploadedFiles(mockUploadedFiles);
  };

  const handleApplyIntake = (target: "summary" | "memo" | "all") => {
    const summary = currentEmr?.triage_summary.summary ?? [];
    const memo = currentEmr?.triage_summary.memo;

    const selectedTexts = [
      target !== "memo" && summary.length > 0
        ? ["AI 사전 문진", ...summary.map((bullet) => `- ${bullet}`)].join("\n")
        : "",
      target !== "summary" && memo ? ["메모", `- ${memo}`].join("\n") : "",
    ].filter(Boolean);

    setEditorValue((prev) =>
      [prev, ...selectedTexts].filter(Boolean).join("\n\n")
    );
  };

  const handleRemoveFile = (fileId: number) => {
    setUploadedFiles((files) => files.filter((file) => file.id !== fileId));
  };

  const handleAddMockFile = () => {
    setUploadedFiles((files) => [
      ...files,
      {
        id: Date.now(),
        label: "추가 이미지",
        url: "https://images.unsplash.com/photo-1525253013412-55c1a69a5738?auto=format&fit=crop&w=200&q=80",
      },
    ]);
  };

  const handleLoadAutoPrescription = () => {
    setPrescriptions(mockAutoPrescriptions);
  };

  return (
    <AppLayout
      session={session}
      activeMenu="emr"
      serviceName="동물병원 EMR 시스템"
      notificationCount={3}
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      <div className="min-h-[calc(100vh-72px)] bg-[#f6f8fb] p-4">
        <div className="grid grid-cols-[300px_minmax(620px,1fr)_320px] gap-4">
          <aside className="space-y-4">
            <QueuePanel
              title={queueTitle}
              activeTab={queueTab}
              queue={currentQueue}
              selectedScheduleId={selectedScheduleId}
              lastRefreshText={lastRefreshText}
              waitingCount={waitingQueue.length}
              completedCount={completedQueue.length}
              onChangeTab={setQueueTab}
              onSelectPatient={setSelectedScheduleId}
              onRefresh={handleRefreshQueue}
            />

            {currentEmr && (
              <IntakePanel
                emr={currentEmr}
                visibleFiles={visibleGuardianFiles}
                hiddenFileCount={hiddenGuardianFileCount}
                onApplyIntake={handleApplyIntake}
                onPreviewImage={(url, label) => setPreviewImage({ url, label })}
              />
            )}
          </aside>

          <main className="space-y-4">
            {currentEmr ? (
              <>
                <PatientInfoPanel
                  patient={currentEmr.pet_info}
                  onEdit={() => setIsProfileEditOpen(true)}
                />
                <HistoryPanel histories={currentEmr.emr_history} />
              </>
            ) : (
              <EmptyPatientPanel />
            )}
            <EditorPanel
              value={editorValue}
              count={editorLength}
              onChange={setEditorValue}
              onCompleteVisit={handleCompleteVisit}
            />
            <PhotoUploadPanel
              files={uploadedFiles}
              onAddFile={handleAddMockFile}
              onRemoveFile={handleRemoveFile}
              onPreviewImage={(url, label) => setPreviewImage({ url, label })}
            />
            <PrescriptionInputPanel
              prescriptions={prescriptions}
              onRemove={(name) =>
                setPrescriptions((items) =>
                  items.filter((item) => item.drug_name !== name)
                )
              }
              onGenerate={() => setIsAutoPanelOpen(true)}
            />
          </main>

          {isAutoPanelOpen && (
            <AutoPrescriptionPanel
              patient={currentEmr?.pet_info}
              prescriptions={mockAutoPrescriptions}
              onClose={() => setIsAutoPanelOpen(false)}
              onLoad={handleLoadAutoPrescription}
              onOpenPreview={() => setIsPrescriptionPreviewOpen(true)}
            />
          )}
        </div>

        {currentEmr && isProfileEditOpen && (
          <ProfileEditModal
            patient={currentEmr.pet_info}
            onClose={() => setIsProfileEditOpen(false)}
          />
        )}

        {previewImage && (
          <ImagePreviewModal
            image={previewImage}
            onClose={() => setPreviewImage(null)}
          />
        )}

        {currentEmr && isPrescriptionPreviewOpen && (
          <PrescriptionPreviewModal
            document={createMockPrescriptionDocument({
              pet: currentEmr.pet_info,
              prescriptions: mockAutoPrescriptions,
            })}
            onClose={() => setIsPrescriptionPreviewOpen(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-[#e4e9f1] bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function QueuePanel({
  title,
  activeTab,
  queue,
  selectedScheduleId,
  lastRefreshText,
  waitingCount,
  completedCount,
  onChangeTab,
  onSelectPatient,
  onRefresh,
}: {
  title: string;
  activeTab: QueueTab;
  queue: QueuePatient[];
  selectedScheduleId?: number;
  lastRefreshText: string;
  waitingCount: number;
  completedCount: number;
  onChangeTab: (tab: QueueTab) => void;
  onSelectPatient: (scheduleId: number) => void;
  onRefresh: () => void;
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h2 className="text-sm font-extrabold text-[#151b28]">{title}</h2>
          <p className="mt-1 text-xs font-bold text-[#8a94a6]">
            갱신 {lastRefreshText}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-[#edf5ff] px-2.5 text-[11px] font-extrabold text-[#2f7df6] transition hover:bg-[#dcecff]"
        >
          <RefreshCcw className="h-4 w-4" />
          대기열 새로고침
        </button>
      </div>

      <div className="grid grid-cols-2 border-y border-[#edf1f6] bg-[#f9fbfe] p-1">
        <QueueTabButton
          active={activeTab === "waiting"}
          label={`진료 대기 ${waitingCount}`}
          onClick={() => onChangeTab("waiting")}
        />
        <QueueTabButton
          active={activeTab === "completed"}
          label={`진료 완료 ${completedCount}`}
          onClick={() => onChangeTab("completed")}
        />
      </div>

      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead className="bg-[#f7f9fc] text-xs font-extrabold text-[#697386]">
            <tr>
              <th className="w-[54px] px-3 py-3">시간</th>
              <th className="px-2 py-3">환자</th>
              <th className="w-[68px] px-2 py-3">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf1f6]">
            {queue.map((patient) => (
              <tr
                key={patient.schedule_id}
                onClick={() => onSelectPatient(patient.schedule_id)}
                className={`cursor-pointer text-xs text-[#5e6879] ${
                  patient.schedule_id === selectedScheduleId
                    ? "bg-[#f3f8ff]"
                    : "hover:bg-[#fafcff]"
                }`}
              >
                <td className="px-3 py-3 font-extrabold tabular-nums">
                  {patient.time}
                </td>
                <td className="px-2 py-3">
                  <p className="font-extrabold text-[#20283a]">
                    {patient.pet_name}
                  </p>
                  <p className="mt-1 truncate font-bold text-[#8a94a6]">
                    {patient.guardian_name} · {patient.species}
                  </p>
                </td>
                <td className="px-2 py-3">
                  <StatusBadge status={patient.triage_status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <a
        href="#queue"
        className="block border-t border-[#edf1f6] px-4 py-3 text-center text-sm font-extrabold text-[#2f7df6]"
      >
        대기열 전체보기
      </a>
    </Panel>
  );
}

function QueueTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-md text-sm font-extrabold transition ${
        active ? "bg-white text-[#2f7df6] shadow-sm" : "text-[#697386]"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: TriageStatus }) {
  const statusInfo = statusStyle[status];

  return (
    <span
      className={`inline-flex h-7 items-center rounded-md border px-2 text-xs font-extrabold ${statusInfo.className}`}
    >
      {statusInfo.label}
    </span>
  );
}

function IntakePanel({
  emr,
  visibleFiles,
  hiddenFileCount,
  onApplyIntake,
  onPreviewImage,
}: {
  emr: EmrResult;
  visibleFiles: string[];
  hiddenFileCount: number;
  onApplyIntake: (target: "summary" | "memo" | "all") => void;
  onPreviewImage: (url: string, label: string) => void;
}) {
  const summary = emr.triage_summary.summary;
  const memo = emr.triage_summary.memo;

  return (
    <Panel>
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-base font-extrabold text-[#151b28]">
          사전 문진 / 메모
        </h2>
        <button type="button" aria-label="닫기">
          <X className="h-4 w-4 text-[#697386]" />
        </button>
      </div>

      <div className="space-y-4 px-4 pb-4">
        <button
          type="button"
          onClick={() => onApplyIntake("all")}
          className="h-9 w-full rounded-lg bg-[#edf5ff] text-sm font-extrabold text-[#2f7df6] transition hover:bg-[#dcecff]"
        >
          사전문진 + 메모 전체 옮기기
        </button>

        <div className="rounded-lg border border-[#edf1f6] p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-[#20283a]">
              AI 요약 문진
            </p>
            <button
              type="button"
              onClick={() => onApplyIntake("summary")}
              disabled={summary.length === 0}
              className="rounded-md bg-[#edf5ff] px-2 py-1 text-xs font-extrabold text-[#2f7df6] transition hover:bg-[#dcecff] disabled:text-[#a8b0bf]"
            >
              옮기기
            </button>
          </div>
          {summary.length > 0 ? (
            <ul className="space-y-2 text-sm font-bold leading-6 text-[#59657a]">
              {summary.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4a89ff]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm font-bold text-[#8a94a6]">
              예약 사전문진 내용이 없습니다.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[#edf1f6] bg-[#fbfcfe] p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-[#20283a]">메모</p>
            <button
              type="button"
              onClick={() => onApplyIntake("memo")}
              disabled={!memo}
              className="rounded-md bg-[#edf5ff] px-2 py-1 text-xs font-extrabold text-[#2f7df6] transition hover:bg-[#dcecff] disabled:text-[#a8b0bf]"
            >
              옮기기
            </button>
          </div>
          <p className="text-sm font-bold leading-6 text-[#59657a]">
            {memo ?? "수의사 메모가 없습니다."}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-extrabold text-[#20283a]">
              첨부 파일
            </p>
            <span className="text-xs font-bold text-[#8a94a6]">
              보호자 업로드
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {visibleFiles.length === 0 && (
              <div className="col-span-4 rounded-lg bg-[#f8fafc] px-3 py-4 text-center text-xs font-bold text-[#8a94a6]">
                보호자 첨부 파일 없음
              </div>
            )}
            {visibleFiles.map((fileUrl, index) => (
              <button
                type="button"
                key={fileUrl}
                onClick={() => onPreviewImage(fileUrl, `보호자 첨부 ${index + 1}`)}
                className="relative h-16 overflow-hidden rounded-lg bg-[#edf1f6]"
              >
                <img
                  src={fileUrl}
                  alt={`보호자 첨부 ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                {index === 3 && hiddenFileCount > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1f2937]/55 text-sm font-extrabold text-white">
                    +{hiddenFileCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function PatientInfoPanel({
  patient,
  onEdit,
}: {
  patient: PetInfo;
  onEdit: () => void;
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between px-5 py-4">
        <div className="flex gap-4">
          <img
            src={patient.profile_image}
            alt={`${patient.pet_name} 사진`}
            className="h-24 w-24 rounded-lg object-cover"
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#151b28]">
                {patient.pet_name}
              </h1>
              <span className="text-2xl font-extrabold text-[#f43f7c]">
                {patient.gender === "Female" ? "♀" : "♂"}
              </span>
            </div>
            <p className="mt-2 text-sm font-extrabold text-[#4d5874]">
              {patient.species} | {patient.gender} | {patient.weight_kg}kg |{" "}
              {patient.age}살({patient.birth_date})
            </p>
            <p className="mt-3 text-sm font-extrabold text-[#4d5874]">
              최근 내원일: {patient.last_visit}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <InfoTag label={patient.is_neutered ? "중성화 O" : "중성화 X"} />
              <InfoTag label={patient.notes} />
            </div>
            <a
              href="#patient-profile"
              className="mt-3 inline-block text-sm font-extrabold text-[#2f7df6]"
            >
              상세 프로필 보기
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="환자 정보 편집"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4d5874] transition hover:bg-[#edf5ff] hover:text-[#2f7df6]"
        >
          <Edit3 className="h-5 w-5" />
        </button>
      </div>
    </Panel>
  );
}

function InfoTag({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-[#f3f6fb] px-2.5 py-1 text-xs font-extrabold text-[#59657a]">
      {label}
    </span>
  );
}

function EmptyPatientPanel() {
  return (
    <Panel>
      <div className="px-5 py-12 text-center">
        <p className="text-base font-extrabold text-[#151b28]">
          대기 중인 환자가 없습니다.
        </p>
        <p className="mt-2 text-sm font-bold text-[#8a94a6]">
          대기열에서 환자를 선택하면 EMR 정보가 표시됩니다.
        </p>
      </div>
    </Panel>
  );
}

function ProfileEditModal({
  patient,
  onClose,
}: {
  patient: PetInfo;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 px-4">
      <div className="w-full max-w-[520px] rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf1f6] px-5 py-4">
          <h2 className="text-lg font-extrabold text-[#151b28]">
            환자 정보 수정
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-[#59657a]" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 px-5 py-5">
          <ProfileInput label="이름" value={patient.pet_name} />
          <ProfileInput label="종류" value={patient.species} />
          <ProfileInput label="성별" value={patient.gender} />
          <ProfileInput label="체중" value={`${patient.weight_kg}kg`} />
          <ProfileInput label="나이" value={`${patient.age}살`} />
          <ProfileInput label="생년월일" value={patient.birth_date} />
          <label className="col-span-2">
            <span className="mb-2 block text-sm font-extrabold text-[#4d5874]">
              특이사항
            </span>
            <textarea
              defaultValue={patient.notes}
              className="h-24 w-full resize-none rounded-lg border border-[#dfe6f1] px-3 py-2 text-sm font-bold text-[#20283a] outline-none focus:border-[#4a89ff]"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf1f6] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#dfe6f1] px-4 text-sm font-extrabold text-[#59657a]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-[#4a89ff] px-4 text-sm font-extrabold text-white"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileInput({ label, value }: { label: string; value: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-extrabold text-[#4d5874]">
        {label}
      </span>
      <input
        defaultValue={value}
        className="h-10 w-full rounded-lg border border-[#dfe6f1] px-3 text-sm font-bold text-[#20283a] outline-none focus:border-[#4a89ff]"
      />
    </label>
  );
}

function ImagePreviewModal({
  image,
  onClose,
}: {
  image: { url: string; label: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/60 px-4">
      <div className="w-full max-w-[760px] rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf1f6] px-5 py-4">
          <h2 className="text-base font-extrabold text-[#151b28]">
            {image.label}
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-[#59657a]" />
          </button>
        </div>
        <div className="bg-[#0f172a] p-4">
          <img
            src={image.url}
            alt={image.label}
            className="mx-auto max-h-[70vh] rounded-lg object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function HistoryPanel({ histories }: { histories: EmrResult["emr_history"] }) {
  return (
    <Panel>
      <div className="border-b border-[#edf1f6] px-5 py-3">
        <h2 className="text-base font-extrabold text-[#151b28]">
          과거 문진 기록
        </h2>
      </div>
      <div className="max-h-[270px] space-y-3 overflow-y-auto px-5 py-4">
        {histories.length === 0 && (
          <div className="rounded-lg bg-[#f8fafc] px-4 py-8 text-center text-sm font-bold text-[#8a94a6]">
            과거 문진 기록이 없습니다.
          </div>
        )}
        {histories.map((history) => (
          <article
            key={history.emr_id}
            className="grid grid-cols-[120px_1fr_280px] gap-4 rounded-lg border border-[#e8edf4] p-4"
          >
            <div>
              <p className="text-sm font-extrabold tabular-nums text-[#4d5874]">
                {history.date}
              </p>
              <p className="mt-2 text-xs font-bold text-[#8a94a6]">
                {history.doctor_name}
              </p>
            </div>
            <p className="text-sm font-bold leading-6 text-[#4d5874]">
              {history.vet_memo}
            </p>
            <div className="rounded-lg bg-[#f8fafc] p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-extrabold text-[#2f7df6]">처방전</p>
                {history.prescriptions.length > 2 && (
                  <button
                    type="button"
                    className="text-xs font-extrabold text-[#59657a]"
                  >
                    펼치기
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {history.prescriptions.slice(0, 2).map((prescription) => (
                  <PrescriptionLine
                    key={`${history.emr_id}-${prescription.drug_name}`}
                    prescription={prescription}
                  />
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function PrescriptionLine({ prescription }: { prescription: Prescription }) {
  return (
    <div className="grid grid-cols-[1fr_46px_46px_46px_42px] gap-2 text-xs font-bold text-[#4d5874]">
      <span className="truncate font-extrabold">{prescription.drug_name}</span>
      <span>{prescription.dosage}</span>
      <span>{prescription.form}</span>
      <span>{prescription.frequency}</span>
      <span>{prescription.duration_days}일</span>
    </div>
  );
}

function EditorPanel({
  value,
  count,
  onChange,
  onCompleteVisit,
}: {
  value: string;
  count: number;
  onChange: (value: string) => void;
  onCompleteVisit: () => void;
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-[#edf1f6] px-5 py-3">
        <h2 className="text-base font-extrabold text-[#151b28]">
          현재 진료 내용 입력
        </h2>
        <button
          type="button"
          onClick={onCompleteVisit}
          className="h-9 rounded-lg bg-[#16a34a] px-4 text-sm font-extrabold text-white transition hover:bg-[#13863f]"
        >
          진료 완료
        </button>
      </div>
      <div className="flex items-center gap-2 border-b border-[#edf1f6] px-5 py-2 text-[#4d5874]">
        <select className="h-8 rounded-md border border-[#dfe6f1] px-2 text-xs font-bold outline-none">
          <option>Pretendard</option>
        </select>
        <select className="h-8 rounded-md border border-[#dfe6f1] px-2 text-xs font-bold outline-none">
          <option>14</option>
        </select>
        {[Bold, Italic, Underline, AlignLeft, List].map((Icon) => (
          <button
            key={Icon.displayName}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#edf5ff] hover:text-[#2f7df6]"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="px-5 py-4">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="진료 내용을 입력하세요..."
          className="h-32 w-full resize-none rounded-lg border border-[#dfe6f1] px-4 py-3 text-sm font-bold leading-6 text-[#20283a] outline-none transition placeholder:text-[#a8b0bf] focus:border-[#4a89ff] focus:ring-4 focus:ring-[#edf5ff]"
        />
        <p className="mt-2 text-right text-xs font-extrabold text-[#8a94a6]">
          글자 수: {count}
        </p>
      </div>
    </Panel>
  );
}

function PhotoUploadPanel({
  files,
  onAddFile,
  onRemoveFile,
  onPreviewImage,
}: {
  files: UploadedFile[];
  onAddFile: () => void;
  onRemoveFile: (fileId: number) => void;
  onPreviewImage: (url: string, label: string) => void;
}) {
  return (
    <Panel>
      <div className="border-b border-[#edf1f6] px-5 py-3">
        <h2 className="text-base font-extrabold text-[#151b28]">사진 등록</h2>
      </div>
      <div className="space-y-3 px-5 py-4">
        <div className="flex gap-3">
          {files.map((file) => (
            <button
              type="button"
              key={file.id}
              onClick={() => onPreviewImage(file.url, file.label)}
              className="relative h-20 w-20 overflow-hidden rounded-lg bg-[#edf1f6]"
            >
              <img
                src={file.url}
                alt={file.label}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveFile(file.id);
                }}
                aria-label="첨부 삭제"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#111827]/70 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          ))}
          <button
            type="button"
            onClick={onAddFile}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-[#cfd8e6] text-sm font-extrabold text-[#4d5874] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
          >
            <Plus className="h-6 w-6" />
            추가
          </button>
        </div>
        <button
          type="button"
          onClick={onAddFile}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-lg border border-dashed border-[#cfd8e6] text-sm font-extrabold text-[#59657a] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
        >
          <FileUp className="h-5 w-5" />
          파일을 드래그하거나 클릭하여 업로드
          <span className="text-xs font-bold text-[#8a94a6]">
            JPG, PNG, DICOM, PDF, MP4 · 최대 50MB
          </span>
        </button>
      </div>
    </Panel>
  );
}

function PrescriptionInputPanel({
  prescriptions,
  onRemove,
  onGenerate,
}: {
  prescriptions: Prescription[];
  onRemove: (name: string) => void;
  onGenerate: () => void;
}) {
  return (
    <Panel>
      <div className="border-b border-[#edf1f6] px-5 py-3">
        <h2 className="text-base font-extrabold text-[#151b28]">처방전</h2>
      </div>
      <div className="space-y-3 px-5 py-4">
        <div className="relative">
          <input
            placeholder="약제명 검색 (예: 아모시실린)"
            className="h-10 w-full rounded-lg border border-[#4a89ff] px-4 pr-10 text-sm font-bold outline-none ring-4 ring-[#edf5ff]"
          />
          <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4a89ff]" />
        </div>

        <div className="overflow-hidden rounded-lg border border-[#e8edf4]">
          <table className="w-full table-fixed text-left">
            <thead className="bg-[#f7f9fc] text-xs font-extrabold text-[#697386]">
              <tr>
                <th className="px-4 py-3">약제명</th>
                <th className="px-3 py-3">형태</th>
                <th className="px-3 py-3">용량</th>
                <th className="px-3 py-3">기간</th>
                <th className="w-[64px] px-3 py-3">삭제</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-9 text-center text-sm font-bold text-[#8a94a6]"
                  >
                    검색을 통해 약을 추가해주세요.
                  </td>
                </tr>
              ) : (
                prescriptions.map((prescription) => (
                  <tr
                    key={prescription.drug_name}
                    className="border-t border-[#edf1f6] text-sm font-bold text-[#4d5874]"
                  >
                    <td className="px-4 py-3 font-extrabold text-[#20283a]">
                      {prescription.drug_name}
                    </td>
                    <td className="px-3 py-3">{prescription.form}</td>
                    <td className="px-3 py-3">{prescription.dosage}</td>
                    <td className="px-3 py-3">
                      {prescription.duration_days}일
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onRemove(prescription.drug_name)}
                        className="text-[#ef4444]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <button className="h-10 rounded-lg border border-[#dfe6f1] px-5 text-sm font-extrabold text-[#4d5874]">
            저장
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className="h-10 rounded-lg bg-[#4a89ff] px-5 text-sm font-extrabold text-white transition hover:bg-[#2f7df6]"
          >
            처방전 자동 생성
          </button>
        </div>
      </div>
    </Panel>
  );
}

function AutoPrescriptionPanel({
  patient,
  prescriptions,
  onClose,
  onLoad,
  onOpenPreview,
}: {
  patient?: PetInfo;
  prescriptions: Prescription[];
  onClose: () => void;
  onLoad: () => void;
  onOpenPreview: () => void;
}) {
  return (
    <Panel className="sticky top-[88px] h-[calc(100vh-104px)] self-start overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-lg font-extrabold text-[#151b28]">자동 처방전</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPreview}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe6f1] text-[#4d5874] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
            aria-label="처방전 미리보기"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4d5874]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="space-y-4 px-5">
        {patient && (
          <p className="text-sm font-extrabold text-[#4d5874]">
            {patient.pet_name} {patient.gender === "Female" ? "♀" : "♂"} (
            {patient.species}, {patient.weight_kg}kg, {patient.age}살)
          </p>
        )}

        <div className="overflow-hidden rounded-lg border border-[#e8edf4]">
          <table className="w-full text-left">
            <thead className="bg-[#f7f9fc] text-xs font-extrabold text-[#697386]">
              <tr>
                <th className="px-3 py-3">약제명</th>
                <th className="px-2 py-3">형태</th>
                <th className="px-2 py-3">투여 방법</th>
                <th className="px-2 py-3">기간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {prescriptions.map((prescription) => (
                <tr
                  key={prescription.drug_name}
                  className="text-xs font-bold text-[#4d5874]"
                >
                  <td className="px-3 py-3 font-extrabold text-[#20283a]">
                    {prescription.drug_name}
                  </td>
                  <td className="px-2 py-3">{prescription.dosage}</td>
                  <td className="px-2 py-3">
                    {prescription.form} {prescription.frequency}
                  </td>
                  <td className="px-2 py-3">
                    {prescription.duration_days}일
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-[#edf1f6] bg-white p-4">
        <button
          type="button"
          onClick={onLoad}
          className="h-10 flex-1 rounded-lg border border-[#dfe6f1] text-sm font-extrabold text-[#4d5874]"
        >
          불러오기
        </button>
        <button className="h-10 flex-1 rounded-lg bg-[#4a89ff] text-sm font-extrabold text-white">
          적용
        </button>
      </div>
    </Panel>
  );
}

function PrescriptionPreviewModal({
  document,
  onClose,
}: {
  document: PrescriptionDocumentResponse;
  onClose: () => void;
}) {
  const data = document.result;
  const issuedDateParts = data.issued_at.match(/(\d{4})년\s*(\d{2})월\s*(\d{2})일/);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/55 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-[900px] overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#edf1f6] px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#151b28]">
              처방전 미리보기
            </h2>
            <p className="mt-1 text-xs font-bold text-[#6b7486]">
              아래는 실제 출력되는 수의사 처방전 양식입니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-sm font-extrabold text-[#4d5874] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
            >
              <Printer className="h-4 w-4" />
              출력
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4d5874] transition hover:bg-[#f3f6fb]"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-78px)] overflow-auto bg-[#f5f7fb] p-6">
          <div className="mx-auto w-[760px] bg-white p-6 text-[#111827] shadow-sm">
            <div className="mb-3 text-[10px] font-bold">
              ■ 수의사법 시행규칙 [별지 제10호서식]
            </div>
            <div className="relative mb-4">
              <h1 className="text-center text-3xl font-extrabold tracking-[0.35em]">
                처 방 전
              </h1>
              <table className="absolute right-0 top-0 w-[270px] border-collapse text-[11px]">
                <tbody>
                  <PrescriptionMetaRow
                    label="발급 연월일"
                    value={`${issuedDateParts?.[1] ?? "2024"} 년 ${
                      issuedDateParts?.[2] ?? "05"
                    } 월 ${issuedDateParts?.[3] ?? "20"} 일`}
                  />
                  <PrescriptionMetaRow
                    label="발급 번호"
                    value={data.issue_number}
                  />
                </tbody>
              </table>
            </div>

            <table className="w-full border-collapse text-[11px]">
              <tbody>
                <tr>
                  <PrescriptionTh className="w-[130px]">
                    처방전 유효기간
                  </PrescriptionTh>
                  <PrescriptionTd colSpan={2}>
                    발급일부터 ( {data.valid_days} )일간
                  </PrescriptionTd>
                  <PrescriptionTd colSpan={4} className="text-center font-bold">
                    처방전 유효기간 내에 구매해야 합니다.
                  </PrescriptionTd>
                </tr>
                <tr>
                  <PrescriptionSideHeader rowSpan={3}>
                    개별 처방
                    <br />
                    [√]
                  </PrescriptionSideHeader>
                  <PrescriptionTh>동물의 이름</PrescriptionTh>
                  <PrescriptionTd>{data.pet.name}</PrescriptionTd>
                  <PrescriptionTh>동물의 소유자 [√]</PrescriptionTh>
                  <PrescriptionTd>{data.pet.owner_name}</PrescriptionTd>
                  <PrescriptionTh>전화번호</PrescriptionTh>
                  <PrescriptionTd>010-1234-5678</PrescriptionTd>
                </tr>
                <tr>
                  <PrescriptionTh>동물의 종류</PrescriptionTh>
                  <PrescriptionTd>{data.pet.species}</PrescriptionTd>
                  <PrescriptionTh>생년월일</PrescriptionTh>
                  <PrescriptionTd>{data.pet.birth_date}</PrescriptionTd>
                  <PrescriptionTh>농장명</PrescriptionTh>
                  <PrescriptionTd>-</PrescriptionTd>
                </tr>
                <tr>
                  <PrescriptionTh>성별/연령/체중 등</PrescriptionTh>
                  <PrescriptionTd colSpan={5}>{data.pet.gender}</PrescriptionTd>
                </tr>
                <tr>
                  <PrescriptionSideHeader rowSpan={2}>
                    군별
                    <br />
                    [ ]
                  </PrescriptionSideHeader>
                  <PrescriptionTh>축사번호</PrescriptionTh>
                  <PrescriptionTd colSpan={5}>-</PrescriptionTd>
                </tr>
                <tr>
                  <PrescriptionTd colSpan={6} className="h-8" />
                </tr>
                <tr>
                  <PrescriptionSideHeader rowSpan={3}>
                    동물병원
                    <br />
                    [√]
                  </PrescriptionSideHeader>
                  <PrescriptionTh>명칭</PrescriptionTh>
                  <PrescriptionTd colSpan={2}>{data.hospital.name}</PrescriptionTd>
                  <PrescriptionTh>전화번호</PrescriptionTh>
                  <PrescriptionTd colSpan={2}>{data.hospital.phone}</PrescriptionTd>
                </tr>
                <tr>
                  <PrescriptionTh>동물의 종류</PrescriptionTh>
                  <PrescriptionTd colSpan={2}>{data.pet.species}</PrescriptionTd>
                  <PrescriptionTh>사업자</PrescriptionTh>
                  <PrescriptionTd colSpan={2}>
                    {data.hospital.business_number}
                  </PrescriptionTd>
                </tr>
                <tr>
                  <PrescriptionTh>마릿수</PrescriptionTh>
                  <PrescriptionTd colSpan={2}>{data.hospital.address}</PrescriptionTd>
                  <PrescriptionTh>동물번호</PrescriptionTh>
                  <PrescriptionTd colSpan={2}>-</PrescriptionTd>
                </tr>
                <tr>
                  <PrescriptionTh colSpan={2}>처방 수의사 성명</PrescriptionTh>
                  <PrescriptionTd colSpan={2}>{data.doctor.name} (서명)</PrescriptionTd>
                  <PrescriptionTh>수의사 면허번호</PrescriptionTh>
                  <PrescriptionTd colSpan={2}>제 {data.doctor.license_number} 호</PrescriptionTd>
                </tr>
              </tbody>
            </table>

            <table className="mt-1 w-full border-collapse text-center text-[11px]">
              <thead>
                <tr>
                  <PrescriptionTh>성분명</PrescriptionTh>
                  <PrescriptionTh>용량<br />(1회 투약량)</PrescriptionTh>
                  <PrescriptionTh>용법</PrescriptionTh>
                  <PrescriptionTh>처방일수<br />(투약일수)</PrescriptionTh>
                  <PrescriptionTh>판매 수량<br />(포장 단위)</PrescriptionTh>
                  <PrescriptionTh>비고</PrescriptionTh>
                  <PrescriptionTh>권장 제품명</PrescriptionTh>
                </tr>
              </thead>
              <tbody>
                {data.prescriptions.map((prescription) => (
                  <tr key={prescription.ingredient}>
                    <PrescriptionTd className="font-bold">
                      {prescription.ingredient}
                    </PrescriptionTd>
                    <PrescriptionTd>{prescription.dosage}</PrescriptionTd>
                    <PrescriptionTd>{prescription.frequency}</PrescriptionTd>
                    <PrescriptionTd>{prescription.duration_days}일</PrescriptionTd>
                    <PrescriptionTd>{prescription.quantity}</PrescriptionTd>
                    <PrescriptionTd>-</PrescriptionTd>
                    <PrescriptionTd>{prescription.product_name}</PrescriptionTd>
                  </tr>
                ))}
                {Array.from({
                  length: Math.max(0, 5 - data.prescriptions.length),
                }).map((_, index) => (
                  <tr key={`empty-${index}`}>
                    {Array.from({ length: 7 }).map((__, cellIndex) => (
                      <PrescriptionTd key={cellIndex} className="h-7" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="mt-1 w-full border-collapse text-[11px]">
              <tbody>
                <tr>
                  <PrescriptionTh colSpan={7} className="text-center">
                    의약품 판매 내용
                  </PrescriptionTh>
                </tr>
                <tr>
                  <PrescriptionTh>판매기관 [ ] 명칭</PrescriptionTh>
                  <PrescriptionTd colSpan={2} />
                  <PrescriptionTh>대표자 성명</PrescriptionTh>
                  <PrescriptionTd colSpan={3} />
                </tr>
                <tr>
                  <PrescriptionTh>판매 약사 성명</PrescriptionTh>
                  <PrescriptionTd colSpan={2} />
                  <PrescriptionTh>면허번호</PrescriptionTh>
                  <PrescriptionTd colSpan={3} />
                </tr>
                <tr>
                  <PrescriptionTh>판매 연월일</PrescriptionTh>
                  <PrescriptionTd colSpan={2} />
                  <PrescriptionTh>비고</PrescriptionTh>
                  <PrescriptionTd colSpan={3} />
                </tr>
              </tbody>
            </table>

            <table className="mt-1 w-full border-collapse text-center text-[11px]">
              <tbody>
                <tr>
                  <PrescriptionTh>판매 제품명(제조사)</PrescriptionTh>
                  <PrescriptionTh>규격(포장 단위)</PrescriptionTh>
                  <PrescriptionTh>판매량</PrescriptionTh>
                  <PrescriptionTh>유통기한</PrescriptionTh>
                  <PrescriptionTh>휴약기간</PrescriptionTh>
                  <PrescriptionTh>비고</PrescriptionTh>
                </tr>
                {Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <PrescriptionTd key={cellIndex} className="h-7" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-right text-[10px] font-bold">
              210mm×297mm[일반용지 60g/㎡(재활용품)]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrescriptionMetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <tr>
      <PrescriptionTh>{label}</PrescriptionTh>
      <PrescriptionTd>{value}</PrescriptionTd>
    </tr>
  );
}

function PrescriptionSideHeader({
  children,
  rowSpan,
}: {
  children: React.ReactNode;
  rowSpan?: number;
}) {
  return (
    <th
      rowSpan={rowSpan}
      className="border border-[#111827] bg-white px-2 py-1 text-center text-[11px] font-extrabold leading-5"
    >
      {children}
    </th>
  );
}

function PrescriptionTh({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      className={`border border-[#111827] bg-[#f8fafc] px-2 py-1 text-left text-[11px] font-extrabold leading-5 ${className}`}
    >
      {children}
    </th>
  );
}

function PrescriptionTd({
  children,
  className = "",
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border border-[#111827] px-2 py-1 text-[11px] font-semibold leading-5 ${className}`}
    >
      {children}
    </td>
  );
}
