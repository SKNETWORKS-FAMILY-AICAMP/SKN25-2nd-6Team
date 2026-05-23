import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchEmrQueue, fetchEmrDetail, fetchEmrReport, fetchEmrValidation, fetchDoctorFollowup } from "../api/emrApi";
import type { ValidationResultResponse, FollowupItem } from "../api/emrApi";
import { updateReservationStatus } from "../api/reservationApi";
import { useAuthStore } from "../stores/auth-store";
import type { AuthState } from "../stores/auth-store";
import type {
  IntakeApplyTarget,
  Prescription,
  PreviewImage,
  QueuePatient,
  QueueTab,
  EmrResult,
  UploadedFile,
} from "../types/emr";

export function useEmrData() {
  const session = useAuthStore((s: AuthState) => s.session);
  const accessToken = session?.accessToken ?? "";

  const [queueTab, setQueueTab] = useState<QueueTab>("waiting");
  const [waitingQueue, setWaitingQueue] = useState<QueuePatient[]>([]);
  const [completedQueue, setCompletedQueue] = useState<QueuePatient[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const [selectedScheduleId, setSelectedScheduleId] = useState<number | undefined>(undefined);
  const [currentEmr, setCurrentEmr] = useState<EmrResult | undefined>(undefined);
  const [isLoadingEmr, setIsLoadingEmr] = useState(false);

  const [editorValue, setEditorValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [autoPrescriptions, setAutoPrescriptions] = useState<Prescription[]>([]);
  const [isLoadingAutoPresc, setIsLoadingAutoPresc] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResultResponse["result"]>(null);
  const [followupItems, setFollowupItems] = useState<FollowupItem[]>([]);
  const [isAutoPanelOpen, setIsAutoPanelOpen] = useState(true);
  const [isPrescriptionPreviewOpen, setIsPrescriptionPreviewOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [lastRefreshText, setLastRefreshText] = useState("방금 전");

  // ── EMR Queue 로드 ──────────────────────────────
  const loadQueue = useCallback(async () => {
    if (!accessToken) return;
    setIsLoadingQueue(true);
    try {
      const result = await fetchEmrQueue({ accessToken });
      setWaitingQueue(result.waiting);
      setCompletedQueue(result.completed);

      // 첫 로드 시 대기 첫 번째 환자 자동 선택
      setSelectedScheduleId((prev: number | undefined) => {
        if (prev !== undefined) return prev;
        return result.waiting[0]?.schedule_id;
      });
    } catch (err) {
      console.error("[EMR Queue] fetch failed:", err);
    } finally {
      setIsLoadingQueue(false);
      setLastRefreshText(
        new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      );
    }
  }, [accessToken]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // ── EMR Detail + Validation + Followup 로드 ────────────────
  useEffect(() => {
    if (selectedScheduleId === undefined || !accessToken) {
      setCurrentEmr(undefined);
      setValidationResult(null);
      setAutoPrescriptions([]);
      setFollowupItems([]);
      return;
    }
    const selectedEmrid = [...waitingQueue, ...completedQueue].find(
      (p) => p.schedule_id === selectedScheduleId,
    )?.emrid;

    let cancelled = false;
    setIsLoadingEmr(true);
    Promise.all([
      fetchEmrDetail({ accessToken, scheduleId: selectedScheduleId }),
      fetchEmrValidation({ accessToken, scheduleId: selectedScheduleId }).catch(() => null),
      selectedEmrid !== undefined
        ? fetchDoctorFollowup({ accessToken, emrid: selectedEmrid }).catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([emr, validation, followups]) => {
        if (!cancelled) {
          setCurrentEmr(emr);
          setValidationResult(validation);
          setFollowupItems(followups);
        }
      })
      .catch((err: unknown) => {
        console.error("[EMR Detail] fetch failed:", err);
        if (!cancelled) {
          setCurrentEmr(undefined);
          setValidationResult(null);
          setFollowupItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingEmr(false);
      });
    return () => { cancelled = true; };
  }, [selectedScheduleId, accessToken, waitingQueue, completedQueue]);

  // ── 파생 상태 ────────────────────────────────────
  const currentQueue = queueTab === "waiting" ? waitingQueue : completedQueue;

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

  // ── 핸들러 ────────────────────────────────────────
  const handleRefreshQueue = useCallback(() => {
    loadQueue();
  }, [loadQueue]);

  const handleCompleteVisit = useCallback(async () => {
    if (selectedScheduleId === undefined) return;

    const targetPatient = waitingQueue.find(
      (p: QueuePatient) => p.schedule_id === selectedScheduleId
    );
    if (!targetPatient) return;

    // API: 상태 업데이트
    try {
      await updateReservationStatus(selectedScheduleId, "진료완료");
    } catch (err) {
      console.error("[CompleteVisit] status update failed:", err);
    }

    // 로컬 큐 업데이트
    const nextWaiting = waitingQueue.filter(
      (p: QueuePatient) => p.schedule_id !== selectedScheduleId
    );
    setWaitingQueue(nextWaiting);
    setCompletedQueue((prev: QueuePatient[]) => [targetPatient, ...prev]);
    setSelectedScheduleId(nextWaiting[0]?.schedule_id);
    setEditorValue("");
    setPrescriptions([]);
    setUploadedFiles([]);
  }, [selectedScheduleId, waitingQueue]);

  const handleApplyIntake = useCallback((target: IntakeApplyTarget) => {
    const summary = currentEmr?.triage_summary.summary ?? [];
    const memo = currentEmr?.triage_summary.memo;

    const selectedTexts = [
      target !== "memo" && summary.length > 0
        ? ["AI 사전 문진", ...summary.map((b: string) => `- ${b}`)].join("\n")
        : "",
      target !== "summary" && memo ? ["메모", `- ${memo}`].join("\n") : "",
    ].filter(Boolean);

    setEditorValue((prev: string) =>
      [prev, ...selectedTexts].filter(Boolean).join("\n\n")
    );
  }, [currentEmr]);

  const handleRemoveFile = useCallback((fileId: number) => {
    setUploadedFiles((files: UploadedFile[]) =>
      files.filter((f: UploadedFile) => f.id !== fileId)
    );
  }, []);

  const handleAddMockFile = useCallback(() => {
    setUploadedFiles((files: UploadedFile[]) => [
      ...files,
      {
        id: Date.now(),
        label: "추가 이미지",
        url: "https://images.unsplash.com/photo-1525253013412-55c1a69a5738?auto=format&fit=crop&w=200&q=80",
      },
    ]);
  }, []);

  const handleLoadAutoPrescription = useCallback(async () => {
    if (selectedScheduleId === undefined) return;
    setIsLoadingAutoPresc(true);
    try {
      const report = await fetchEmrReport({ accessToken, scheduleId: selectedScheduleId });
      if (!report?.ai_draft_json) {
        setAutoPrescriptions([]);
        return;
      }
      const draft = report.ai_draft_json as {
        prescription_draft?: { medications?: Array<Record<string, string>> };
      };
      const meds = draft.prescription_draft?.medications ?? [];
      const mapped: Prescription[] = meds.map((m) => ({
        drug_name: m.name ?? "",
        dosage: m.dosage ?? "",
        form: m.route ?? "",
        frequency: m.frequency ?? "",
        duration_days: parseInt(m.duration ?? "0", 10) || 0,
      }));
      setAutoPrescriptions(mapped);
      if (mapped.length > 0) setPrescriptions(mapped);
    } catch (err) {
      console.error("[AutoPrescription] fetch failed:", err);
      setAutoPrescriptions([]);
    } finally {
      setIsLoadingAutoPresc(false);
    }
  }, [selectedScheduleId, accessToken]);

  const handleRemovePrescription = useCallback((name: string) => {
    setPrescriptions((items: Prescription[]) =>
      items.filter((item: Prescription) => item.drug_name !== name)
    );
  }, []);

  const openPreviewImage = useCallback((url: string, label: string) => {
    setPreviewImage({ url, label });
  }, []);

  return {
    queueTab,
    waitingQueue,
    completedQueue,
    selectedScheduleId,
    editorValue,
    uploadedFiles,
    prescriptions,
    autoPrescriptions,
    isLoadingAutoPresc,
    validationResult,
    followupItems,
    isAutoPanelOpen,
    isPrescriptionPreviewOpen,
    isProfileEditOpen,
    previewImage,
    lastRefreshText,
    isLoadingQueue,
    isLoadingEmr,
    currentQueue,
    currentEmr,
    visibleGuardianFiles,
    hiddenGuardianFileCount,
    queueTitle,
    setQueueTab,
    setSelectedScheduleId,
    setEditorValue,
    setIsAutoPanelOpen,
    setIsPrescriptionPreviewOpen,
    setIsProfileEditOpen,
    setPreviewImage,
    handleRefreshQueue,
    handleCompleteVisit,
    handleApplyIntake,
    handleRemoveFile,
    handleAddMockFile,
    handleLoadAutoPrescription,
    handleRemovePrescription,
    openPreviewImage,
  };
}
