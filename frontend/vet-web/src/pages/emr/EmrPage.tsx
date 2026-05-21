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
import {
  createMockPrescriptionDocument,
  mockAutoPrescriptions,
} from "./emrMockData";

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
    handleRefreshQueue,
    handleCompleteVisit,
    handleApplyIntake,
    handleRemoveFile,
    handleAddMockFile,
    handleLoadAutoPrescription,
    handleRemovePrescription,
    openPreviewImage,
  } = useEmrData();

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
              count={editorValue.length}
              onChange={setEditorValue}
              onCompleteVisit={handleCompleteVisit}
            />
            <PhotoUploadPanel
              files={uploadedFiles}
              onAddFile={handleAddMockFile}
              onRemoveFile={handleRemoveFile}
              onPreviewImage={openPreviewImage}
            />
            <PrescriptionInputPanel
              prescriptions={prescriptions}
              onRemove={handleRemovePrescription}
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
