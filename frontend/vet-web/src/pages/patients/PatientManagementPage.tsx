import { AuthSession } from "../../api/authApi";
import { PatientDetailView } from "../../components/patients/PatientDetailView";
import { PatientListView } from "../../components/patients/PatientListView";
import { usePatientManagement } from "../../hooks/usePatientManagement";
import AppLayout, { AppMenuId } from "../../layouts/AppLayout";

interface PatientManagementPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNavigate: (menuId: AppMenuId) => void;
}

export default function PatientManagementPage({
  session,
  onLogout,
  onNavigate,
}: PatientManagementPageProps) {
  const {
    searchValue,
    selectedSpecies,
    currentPage,
    pagePatients,
    totalCount,
    totalPages,
    isLoading,
    selectedPatient,
    selectedHistory,
    setCurrentPage,
    updateSearch,
    updateSpecies,
    handleOpenDetail,
    closeDetail,
    handleSaved,
  } = usePatientManagement(session.accessToken);

  return (
    <AppLayout
      session={session}
      activeMenu="patients"
      notificationCount={1}
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      {selectedPatient ? (
        <PatientDetailView
          accessToken={session.accessToken}
          patient={selectedPatient}
          history={selectedHistory}
          onBack={closeDetail}
          onSaved={handleSaved}
        />
      ) : (
        <PatientListView
          searchValue={searchValue}
          selectedSpecies={selectedSpecies}
          currentPage={currentPage}
          totalCount={totalCount}
          totalPages={totalPages}
          isLoading={isLoading}
          patients={pagePatients}
          onSearch={updateSearch}
          onChangeSpecies={updateSpecies}
          onChangePage={setCurrentPage}
          onOpenDetail={handleOpenDetail}
        />
      )}
    </AppLayout>
  );
}
