import { useMemo, useState } from "react";
import axios from "axios";
import { AuthSession } from "../../api/authApi";
import {
  createReservation,
  deleteReservation,
  updateReservation,
} from "../../api/reservationApi";
import { CancelReservationModal } from "../../components/reservation/CancelReservationModal";
import { DailyTimeline } from "../../components/reservation/DailyTimeline";
import { DetailPanel } from "../../components/reservation/DetailPanel";
import { MiniCalendar } from "../../components/reservation/MiniCalendar";
import { MonthlyCalendar } from "../../components/reservation/MonthlyCalendar";
import { ReservationFormModal } from "../../components/reservation/ReservationFormModal";
import { StatusFilter } from "../../components/reservation/StatusFilter";
import { TopControls } from "../../components/reservation/TopControls";
import { WeeklySchedule } from "../../components/reservation/WeeklySchedule";
import { useReservationData } from "../../hooks/useReservationData";
import AppLayout, { AppMenuId } from "../../layouts/AppLayout";
import type {
  ModalMode,
  ReservationFormState,
  ReservationPatient,
  ReservationStatus,
  ReservationViewMode,
} from "../../types/reservation";
import {
  TODAY,
  addDays,
  addMonths,
  getControlLabel,
  getDateKey,
  statusOrder,
} from "../../utils/reservationUtils";

interface ReservationPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNavigate: (menuId: AppMenuId) => void;
}

export default function ReservationPage({
  session,
  onLogout,
  onNavigate,
}: ReservationPageProps) {
  const {
    reservations,
    patientsById,
    patientOptions,
    doctorOptions,
    isLoading,
    loadReservations,
  } = useReservationData(session.accessToken);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [viewMode, setViewMode] = useState<ReservationViewMode>("day");
  const [selectedReservationId, setSelectedReservationId] = useState(0);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const dayKey = getDateKey(selectedDate);
  const visibleReservations = useMemo(
    () =>
      reservations
        .filter(
          (reservation) =>
            reservation.date === dayKey && reservation.start !== "12:00"
        )
        .sort((a, b) => a.start.localeCompare(b.start)),
    [reservations, dayKey]
  );

  const selectedReservation =
    visibleReservations.find(
      (reservation) => reservation.id === selectedReservationId
    ) ?? visibleReservations[0];
  const selectedPatient = selectedReservation
    ? patientsById[selectedReservation.patientId]
    : undefined;

  const controlLabel = useMemo(
    () => getControlLabel(viewMode, selectedDate),
    [selectedDate, viewMode]
  );

  const statusCounts = useMemo(
    () =>
      statusOrder.reduce<Record<ReservationStatus, number>>((acc, status) => {
        acc[status] = visibleReservations.filter(
          (reservation) => reservation.status === status
        ).length;
        return acc;
      }, {} as Record<ReservationStatus, number>),
    [visibleReservations]
  );

  const handlePrev = () => {
    setSelectedDate((date) => {
      if (viewMode === "month") {
        return addMonths(date, -1);
      }

      if (viewMode === "week") {
        return addDays(date, -7);
      }

      return addDays(date, -1);
    });
  };

  const handleNext = () => {
    setSelectedDate((date) => {
      if (viewMode === "month") {
        return addMonths(date, 1);
      }

      if (viewMode === "week") {
        return addDays(date, 7);
      }

      return addDays(date, 1);
    });
  };

  const handleSaveReservation = async (
    patient: ReservationPatient,
    form: ReservationFormState
  ) => {
    try {
      if (modalMode === "edit" && selectedReservation) {
        await updateReservation(selectedReservation.id, {
          date: form.dateKey,
          time: form.time,
          doctor_name: form.doctorName || undefined,
          memo: form.memo,
        });
      } else {
        await createReservation({
          pet_id: patient.id,
          date: form.dateKey,
          time: form.time,
          doctor_name: form.doctorName || undefined,
          memo: form.memo,
        });
      }

      setModalMode(null);
      await loadReservations();
    } catch (error) {
      console.error("예약 저장 실패:", error);
      const message =
        (axios.isAxiosError(error) && error.response?.data?.detail) ||
        "예약 저장에 실패했습니다.";
      alert(message);
    }
  };

  const handleCancelReservation = async () => {
    if (!selectedReservation) {
      return;
    }

    try {
      await deleteReservation(selectedReservation.id);
      setSelectedReservationId(0);
      setIsCancelOpen(false);
      await loadReservations();
    } catch (error) {
      console.error("예약 취소 실패:", error);
      alert("예약 취소에 실패했습니다.");
    }
  };

  return (
    <AppLayout
      session={session}
      activeMenu="reservation"
      notificationCount={2}
      onLogout={onLogout}
      onNavigate={onNavigate}
    >
      <div className="h-[calc(100vh-72px)] overflow-hidden bg-[#f7f9fc]">
        <TopControls
          controlLabel={controlLabel}
          viewMode={viewMode}
          isLoading={isLoading}
          onChangeViewMode={setViewMode}
          onAdd={() => setModalMode("add")}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={() => setSelectedDate(TODAY)}
          onRefresh={loadReservations}
        />

        {viewMode === "day" && (
          <div className="grid h-[calc(100vh-140px)] grid-cols-[270px_minmax(430px,1fr)_330px] gap-3 px-4 pb-4">
            <aside className="space-y-4">
              <MiniCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
              <StatusFilter counts={statusCounts} />
            </aside>

            <DailyTimeline
              selectedDate={selectedDate}
              reservations={visibleReservations}
              patientsById={patientsById}
              selectedReservationId={selectedReservationId}
              onSelect={setSelectedReservationId}
            />

            <DetailPanel
              selectedDate={selectedDate}
              reservation={selectedReservation}
              patient={selectedPatient}
              onEdit={() => setModalMode("edit")}
              onCancel={() => setIsCancelOpen(true)}
            />
          </div>
        )}

        {viewMode === "week" && (
          <WeeklySchedule
            selectedDate={selectedDate}
            reservations={reservations}
            patientsById={patientsById}
            onSelectReservation={(reservation, reservationDate) => {
              setSelectedDate(reservationDate);
              setSelectedReservationId(reservation.id);
              setViewMode("day");
            }}
          />
        )}

        {viewMode === "month" && (
          <MonthlyCalendar
            selectedDate={selectedDate}
            reservations={reservations}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setViewMode("day");
            }}
          />
        )}
      </div>

      {modalMode && (
        <ReservationFormModal
          mode={modalMode}
          selectedDate={selectedDate}
          reservation={modalMode === "edit" ? selectedReservation : undefined}
          patient={modalMode === "edit" ? selectedPatient : undefined}
          patientOptions={patientOptions}
          doctorOptions={doctorOptions}
          onClose={() => setModalMode(null)}
          onSave={handleSaveReservation}
        />
      )}

      {isCancelOpen && selectedPatient && (
        <CancelReservationModal
          patientName={selectedPatient.petName}
          onClose={() => setIsCancelOpen(false)}
          onConfirm={handleCancelReservation}
        />
      )}
    </AppLayout>
  );
}
