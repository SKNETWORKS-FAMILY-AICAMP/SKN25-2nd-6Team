import { useMemo, useState } from "react";
import {
  mockAutoPrescriptions,
  mockCompletedQueue,
  mockEmrResponsesByScheduleId,
  mockUploadedFiles,
  mockWaitingQueue,
} from "../pages/emr/emrMockData";
import type { Prescription } from "../pages/emr/emrMockData";
import type { IntakeApplyTarget, PreviewImage, QueueTab } from "../types/emr";

export function useEmrData() {
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
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [lastRefreshText, setLastRefreshText] = useState("방금 전");

  const currentQueue = queueTab === "waiting" ? waitingQueue : completedQueue;
  const currentEmr =
    selectedScheduleId !== undefined
      ? mockEmrResponsesByScheduleId[selectedScheduleId]?.result
      : undefined;
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

  const handleApplyIntake = (target: IntakeApplyTarget) => {
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

  const handleRemovePrescription = (name: string) => {
    setPrescriptions((items) =>
      items.filter((item) => item.drug_name !== name)
    );
  };

  const openPreviewImage = (url: string, label: string) => {
    setPreviewImage({ url, label });
  };

  return {
    queueTab,
    waitingQueue,
    completedQueue,
    selectedScheduleId,
    editorValue,
    uploadedFiles,
    prescriptions,
    isAutoPanelOpen,
    isPrescriptionPreviewOpen,
    isProfileEditOpen,
    previewImage,
    lastRefreshText,
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
