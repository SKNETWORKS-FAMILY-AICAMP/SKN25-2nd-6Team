import { useState } from "react";
import { AuthSession } from "../../api/authApi";
import { AutoPrescriptionPanel } from "../../components/emr/AutoPrescriptionPanel";
import {
  EditorPanel,
  PhotoUploadPanel,
  PrescriptionInputPanel,
} from "../../components/emr/EditorPanels";
import { ImagePreviewModal } from "../../components/emr/ImagePreviewModal";
import { IntakePanel } from "../../components/emr/IntakePanel";
import {
  EmptyPatientPanel,
  HistoryPanel,
  PatientInfoPanel,
} from "../../components/emr/PatientPanels";
import { PrescriptionPreviewModal } from "../../components/emr/PrescriptionPreviewModal";
import { ProfileEditModal } from "../../components/emr/ProfileEditModal";
import { QueuePanel } from "../../components/emr/QueuePanel";
import { useEmrData } from "../../hooks/useEmrData";
import AppLayout, { AppMenuId } from "../../layouts/AppLayout";
import { createMockPrescriptionDocument } from "./emrMockData";

interface EmrPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNavigate: (menuId: AppMenuId) => void;
}

export default function EmrPage({ session, onLogout, onNavigate }: EmrPageProps) {
  const {
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
    autoPrescriptions,
    validationResult,
    followupItems,
    handleRefreshQueue,
    handleCompleteVisit,
    handleApplyIntake,
    handleRemoveFile,
    handleAddMockFile,
    handleLoadAutoPrescription,
    handleRemovePrescription,
    openPreviewImage,
  } = useEmrData();
  const [isChecksExpanded, setIsChecksExpanded] = useState(false);
  const isReadOnly = queueTab === "completed";

  return (
    <AppLayout
      session={session}
      activeMenu="emr"
      serviceName="동물병원 의료 보조 시스템"
      notificationCount={3}
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      <div className="min-h-[calc(100vh-72px)] bg-[#f6f8fb] p-4">
        <div className="grid grid-cols-[300px_minmax(620px,1fr)_320px] gap-4">
          <aside className="sticky top-[88px] grid h-[calc(100vh-104px)] grid-rows-[320px_minmax(0,1fr)] gap-3 overflow-hidden">
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
                onPreviewImage={openPreviewImage}
                isReadOnly={isReadOnly}
              />
            )}
          </aside>

          <main className="space-y-4">
            {currentEmr ? (
              <>
                <PatientInfoPanel
                  patient={currentEmr.pet_info}
                  onEdit={() => setIsProfileEditOpen(true)}
                  isReadOnly={isReadOnly}
                />
                <HistoryPanel histories={currentEmr.emr_history} />
                {validationResult && validationResult.overall !== "OK" && (
                  <div
                    className={`rounded-lg border text-sm font-bold ${
                      validationResult.overall === "REVIEW_NEEDED"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-yellow-200 bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    <div className="flex items-center justify-between px-4 py-3">
                      <span>
                        <span className="mr-2">
                          {validationResult.overall === "REVIEW_NEEDED" ? "⚠️ 검토 필요" : "⚠️ 검증 경고"}
                        </span>
                        {validationResult.summary ?? "AI 검증 결과를 확인하세요."}
                      </span>
                      {validationResult.checks && (
                        <button
                          type="button"
                          onClick={() => setIsChecksExpanded((v) => !v)}
                          className="ml-3 shrink-0 text-xs underline opacity-70 hover:opacity-100"
                        >
                          {isChecksExpanded ? "접기" : "상세보기"}
                        </button>
                      )}
                    </div>
                    {isChecksExpanded && Array.isArray(validationResult.checks) && (
                      <ul className="border-t border-current/20 px-4 pb-3 pt-2 space-y-1">
                        {(validationResult.checks as Array<{ item: string; status: string; detail: string }>).map(
                          (c) => (
                            <li key={c.item} className="flex gap-2 text-xs font-medium">
                              <span>{c.status === "PASS" ? "✅" : "⚠️"}</span>
                              <span>
                                <span className="font-extrabold">{c.item}</span>
                                {c.detail ? ` — ${c.detail}` : ""}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </div>
                )}
                {followupItems.length > 0 && (
                  <div className="rounded-xl border border-[#e8edf4] bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-sm font-extrabold text-[#151b28]">경과 보고</h3>
                    <div className="space-y-3">
                      {followupItems.map((item) => (
                        <div key={item.followup_id} className={`border-l-2 pl-3 ${item.emergency_alert ? 'border-red-500 bg-red-50/50 pr-2 py-1' : 'border-[#4a89ff]'}`}>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-[#a8b0bf]">
                              {item.created_at
                                ? new Date(item.created_at).toLocaleString("ko-KR", {
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </p>
                            {item.emergency_alert && (
                              <span className="text-[10px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                                🚨 응급 신호 감지
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-[#151b28]">
                            {item.message ?? "(내용 없음)"}
                          </p>
                          {item.ai_summary && (
                            <div className="mt-1 bg-slate-50 p-2 rounded text-xs text-[#4e5968] border border-slate-100">
                              <span className="font-extrabold text-blue-600">AI 요약:</span> {item.ai_summary}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyPatientPanel />
            )}
            <EditorPanel
              value={editorValue}
              count={editorValue.length}
              onChange={setEditorValue}
              onCompleteVisit={handleCompleteVisit}
              isReadOnly={isReadOnly}
            />
            <PhotoUploadPanel
              files={uploadedFiles}
              onAddFile={handleAddMockFile}
              onRemoveFile={handleRemoveFile}
              onPreviewImage={openPreviewImage}
              isReadOnly={isReadOnly}
            />
            <PrescriptionInputPanel
              prescriptions={prescriptions}
              onRemove={handleRemovePrescription}
              onGenerate={() => setIsAutoPanelOpen(true)}
              isReadOnly={isReadOnly}
            />
          </main>

          {isAutoPanelOpen && (
            <AutoPrescriptionPanel
              patient={currentEmr?.pet_info}
              prescriptions={autoPrescriptions}
              onClose={() => setIsAutoPanelOpen(false)}
              onLoad={handleLoadAutoPrescription}
              onOpenPreview={() => setIsPrescriptionPreviewOpen(true)}
              isReadOnly={isReadOnly}
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
              prescriptions: autoPrescriptions,
            })}
            onClose={() => setIsPrescriptionPreviewOpen(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}
