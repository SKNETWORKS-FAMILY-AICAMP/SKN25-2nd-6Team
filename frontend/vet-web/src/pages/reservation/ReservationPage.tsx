import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";
import { AuthSession } from "../../api/authApi";
import AppLayout, { AppMenuId } from "../../layouts/AppLayout";
import {
  getReservations,
  createReservation,
  updateReservation,
  deleteReservation,
} from "../../api/reservationApi"

interface ReservationPageProps {
  session: AuthSession;
  onLogout: () => void;
  onNavigate: (menuId: AppMenuId) => void;
}

type ModalMode = "add" | "edit" | null;
type ReservationViewMode = "day" | "week" | "month";

export type ReservationStatus =
  | "emergency"
  | "semiEmergency"
  | "normal";

export interface ReservationPatient {
  id: number;
  petName: string;
  guardianName: string;
  phone: string;
  species: "강아지" | "고양이";
  breed: string;
  birthDate: string;
  age: string;
  weight: string;
  gender: "남아" | "여아";
  isNeutered: boolean;
  lastCheckupDate: string;
  imageUrl: string;
}

export interface ReservationItem {
  id: number;
  patientId: number;
  date: string;
  start: string;
  end: string;
  status: ReservationStatus;
  visitReason: string;
  doctorName: string;
  memo: string;
}

type PatientsById = Record<number, ReservationPatient>;

const reservationStatusMeta: Record<
  ReservationStatus,
  { label: string; badgeClass: string; softClass: string }
> = {
  emergency: {
    label: "응급",
    badgeClass: "bg-[#fdecee] text-[#c95f69]",
    softClass: "bg-[#fdecee] text-[#c95f69]",
  },
  semiEmergency: {
    label: "준응급",
    badgeClass: "bg-[#fff0df] text-[#c87832]",
    softClass: "bg-[#fff0df] text-[#c87832]",
  },
  normal: {
    label: "일반",
    badgeClass: "bg-[#edf4ff] text-[#4b76c8]",
    softClass: "bg-[#edf4ff] text-[#4b76c8]",
  },
};

const reservationTimes = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

const DEFAULT_PET_IMAGE =
  "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=240&q=80";

interface ApiReservation {
  schedule_id: number;
  petid: number;
  pet_name: string;
  species: string;
  breed: string;
  birth_date: string;
  age: string;
  weight_kg: number;
  gender: string;
  is_neutered: boolean;
  profile_image: string | null;
  last_checkup_date: string;
  owner_name: string;
  phone: string;
  doctor_name: string;
  visit_reason: string;
  triage: ReservationStatus;
  date: string;
  start: string;
  end: string;
  duration_min: number;
  memo: string;
  status: string;
}

function dotDate(value: string) {
  return value ? value.replace(/-/g, ".") : "";
}

function mapApiReservations(items: ApiReservation[]): {
  reservations: ReservationItem[];
  patientsById: PatientsById;
} {
  const reservations: ReservationItem[] = [];
  const patientsById: PatientsById = {};

  for (const item of items) {
    reservations.push({
      id: item.schedule_id,
      patientId: item.petid,
      date: item.date,
      start: item.start,
      end: item.end,
      status: item.triage ?? "normal",
      visitReason: item.visit_reason,
      doctorName: item.doctor_name,
      memo: item.memo,
    });

    if (!patientsById[item.petid]) {
      patientsById[item.petid] = {
        id: item.petid,
        petName: item.pet_name,
        guardianName: item.owner_name,
        phone: item.phone,
        species: item.species === "고양이" ? "고양이" : "강아지",
        breed: item.breed,
        birthDate: dotDate(item.birth_date),
        age: item.age,
        weight: item.weight_kg ? `${item.weight_kg}kg` : "",
        gender: item.gender === "female" ? "여아" : "남아",
        isNeutered: item.is_neutered,
        lastCheckupDate: dotDate(item.last_checkup_date),
        imageUrl: item.profile_image || DEFAULT_PET_IMAGE,
      };
    }
  }

  return { reservations, patientsById };
}

const TODAY = new Date(2026, 4, 19);
const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const weekDayLabels = ["월", "화", "수", "목", "금", "토", "일"];

const statusOrder: ReservationStatus[] = [
  "emergency",
  "semiEmergency",
  "normal",
];

function getReservationAt(reservations: ReservationItem[], start: string) {
  return reservations.find((reservation) => reservation.start === start);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getMonday(date: Date) {
  const target = startOfDay(date);
  const day = target.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(target, diff);
}

function getWeekDays(date: Date) {
  const monday = getMonday(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function getMonthGrid(date: Date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = addDays(firstDay, -firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function formatDateWithWeekday(date: Date) {
  return `${formatDate(date)} (${dayLabels[date.getDay()]})`;
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatMonthTitle(date: Date) {
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, "0")}월`;
}

function formatWeekRange(date: Date) {
  const days = getWeekDays(date);
  return `${formatDateWithWeekday(days[0])} ~ ${formatDateWithWeekday(days[6])}`;
}

function getControlLabel(viewMode: ReservationViewMode, selectedDate: Date) {
  if (viewMode === "week") {
    return formatWeekRange(selectedDate);
  }

  if (viewMode === "month") {
    return formatMonthTitle(selectedDate);
  }

  return formatDateWithWeekday(selectedDate);
}

export default function ReservationPage({
  session,
  onLogout,
  onNavigate,
}: ReservationPageProps) {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [patientsById, setPatientsById] = useState<PatientsById>({});
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [viewMode, setViewMode] = useState<ReservationViewMode>("day");
  const [selectedReservationId, setSelectedReservationId] = useState(0);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getReservations();
      const items: ApiReservation[] = data?.result ?? [];
      const mapped = mapApiReservations(items);
      setReservations(mapped.reservations);
      setPatientsById(mapped.patientsById);
    } catch (error) {
      console.error("예약 목록 조회 실패:", error);
      setReservations([]);
      setPatientsById({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

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
    visibleReservations.find((reservation) => reservation.id === selectedReservationId) ??
    visibleReservations[0];
  const selectedPatient = selectedReservation
    ? patientsById[selectedReservation.patientId]
    : undefined;

  const controlLabel = useMemo(
    () => getControlLabel(viewMode, selectedDate),
    [selectedDate, viewMode]
  );

  const patientOptions = useMemo(
    () => Object.values(patientsById),
    [patientsById]
  );

  const doctorOptions = useMemo(() => {
    const names = new Set<string>();
    reservations.forEach((reservation) => {
      if (reservation.doctorName) {
        names.add(reservation.doctorName);
      }
    });
    return Array.from(names);
  }, [reservations]);

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
              <MiniCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
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

function TopControls({
  controlLabel,
  viewMode,
  isLoading,
  onChangeViewMode,
  onAdd,
  onPrev,
  onNext,
  onToday,
  onRefresh,
}: {
  controlLabel: string;
  viewMode: ReservationViewMode;
  isLoading: boolean;
  onChangeViewMode: (mode: ReservationViewMode) => void;
  onAdd: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="grid h-[68px] grid-cols-[1fr_auto_1fr] items-center border-b border-[#edf1f6] bg-white px-4">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton label="이전 날짜" onClick={onPrev}>
          <ChevronLeft className="h-5 w-5" />
        </IconButton>
        <button
          type="button"
          className="flex h-10 min-w-0 max-w-[360px] items-center gap-2 truncate rounded-lg border border-[#dfe6f1] bg-white px-3 text-sm font-extrabold text-[#20283a]"
        >
          <CalendarDays className="h-4 w-4 text-[#53617c]" />
          {controlLabel}
        </button>
        <IconButton label="다음 날짜" onClick={onNext}>
          <ChevronRight className="h-5 w-5" />
        </IconButton>
        <button
          type="button"
          onClick={onToday}
          className="ml-2 h-10 rounded-lg border border-[#dfe6f1] bg-white px-4 text-sm font-extrabold text-[#4d5874]"
        >
          오늘
        </button>
      </div>

      <div className="flex items-center justify-center gap-3">
        {[
          ["day", "일간"],
          ["week", "주간"],
          ["month", "월간"],
        ].map(([mode, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => onChangeViewMode(mode as ReservationViewMode)}
            className={[
              "h-10 rounded-lg px-5 text-sm font-extrabold transition",
              viewMode === mode
                ? "bg-[#0f62fe] text-white shadow-sm"
                : "border border-[#dfe6f1] bg-white text-[#4d5874]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex h-10 items-center gap-2 rounded-lg border border-[#dfe6f1] bg-white px-4 text-sm font-extrabold text-[#4d5874] disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          새로고침
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="flex h-10 items-center gap-2 rounded-lg bg-[#0f62fe] px-5 text-sm font-extrabold text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          예약 추가
        </button>
      </div>
    </div>
  );
}

function MiniCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const days = getMonthGrid(visibleMonth);

  useEffect(() => {
    setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  return (
    <section className="rounded-lg border border-[#e5eaf2] bg-white p-4 shadow-sm">
      <div className="mb-3 grid grid-cols-[32px_1fr_32px] items-center">
        <button
          type="button"
          onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53617c] transition hover:bg-[#f3f6fb] hover:text-[#0f62fe]"
          aria-label="이전 달"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-center text-base font-extrabold text-[#151b28]">
          {formatMonthTitle(visibleMonth)}
        </h2>
        <button
          type="button"
          onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53617c] transition hover:bg-[#f3f6fb] hover:text-[#0f62fe]"
          aria-label="다음 달"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1.5 text-center text-xs font-extrabold text-[#53617c]">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <span key={day}>{day}</span>
        ))}
        {days.map((day) => {
          const isToday = isSameDate(day, TODAY);
          const isSelected = isSameDate(day, selectedDate);
          const isRed = day.getDay() === 0;
          const isMuted = day.getMonth() !== visibleMonth.getMonth();

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                onSelectDate(day);
                setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1));
              }}
              className={[
                "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold",
                isToday
                  ? "bg-[#0f62fe] text-white"
                  : isSelected
                    ? "bg-[#edf5ff] text-[#0f62fe]"
                    : isRed
                      ? "text-[#ef4444]"
                      : isMuted
                        ? "text-[#a4adbd]"
                        : "text-[#20283a] hover:bg-[#edf5ff]",
              ].join(" ")}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StatusFilter({ counts }: { counts: Record<ReservationStatus, number> }) {
  return (
    <section className="rounded-lg border border-[#e5eaf2] bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-sm font-extrabold text-[#151b28]">상태 필터</h2>
      <div className="space-y-3">
        {statusOrder.map((status) => {
          const meta = reservationStatusMeta[status];

          return (
            <div key={status} className="flex items-center justify-between">
              <span
                className={`rounded-md px-3 py-1.5 text-sm font-extrabold ${meta.softClass}`}
              >
                {meta.label}
              </span>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-[#edf1f6] bg-white px-2 text-sm font-extrabold text-[#20283a]">
                {counts[status] ?? 0}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DailyTimeline({
  selectedDate,
  reservations,
  patientsById,
  selectedReservationId,
  onSelect,
}: {
  selectedDate: Date;
  reservations: ReservationItem[];
  patientsById: PatientsById;
  selectedReservationId: number;
  onSelect: (id: number) => void;
}) {
  return (
    <section className="h-full overflow-hidden rounded-lg border border-[#e5eaf2] bg-white p-4 shadow-sm">
      <div className="mb-2 text-center">
        <p className="text-base font-extrabold text-[#151b28]">
          {dayLabels[selectedDate.getDay()]}요일
        </p>
        <p className="text-sm font-extrabold text-[#1d2a57]">
          {selectedDate.getMonth() + 1}/{selectedDate.getDate()}
        </p>
      </div>

      <div className="space-y-1.5">
        {reservationTimes.map((time) => {
          const reservation = getReservationAt(reservations, time);
          const patient = reservation ? patientsById[reservation.patientId] : undefined;
          const isLunch = time === "12:00";

          return (
            <div key={time} className="grid grid-cols-[58px_1fr] gap-3">
              <div className="pt-3 text-sm font-extrabold tabular-nums text-[#1d2a57]">
                {time}
              </div>
              {isLunch ? (
                <div className="flex h-[42px] items-center gap-8 rounded-lg border border-[#edf1f6] bg-[#f7f8fa] px-4 text-sm font-extrabold text-[#1d2a57]">
                  <span>12:00 ~ 13:00</span>
                  <span>점심시간</span>
                </div>
              ) : reservation && patient ? (
                <button
                  type="button"
                  onClick={() => onSelect(reservation.id)}
                  className={[
                    "flex h-[50px] w-full items-center gap-3 rounded-lg border bg-white px-3 text-left transition",
                    selectedReservationId === reservation.id
                      ? "border-[#0f62fe] shadow-[0_0_0_2px_rgba(15,98,254,0.08)]"
                      : "border-[#edf1f6] hover:border-[#b8cdfc]",
                  ].join(" ")}
                >
                  <img
                    src={patient.imageUrl}
                    alt={patient.petName}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold tabular-nums text-[#1d2a57]">
                      {reservation.start} ~ {reservation.end}
                    </p>
                    <p className="truncate text-sm font-extrabold text-[#1d2a57]">
                      {patient.petName} ({patient.guardianName})
                    </p>
                  </div>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-extrabold ${reservationStatusMeta[reservation.status].badgeClass}`}
                  >
                    {reservationStatusMeta[reservation.status].label}
                  </span>
                </button>
              ) : (
                <div className="h-[42px] rounded-lg border border-dashed border-[#edf1f6]" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const weeklyCardClass: Record<ReservationStatus, string> = {
  emergency: "border-[#f4cfd5] bg-[#fffafb] text-[#20283a] before:bg-[#e7a6af]",
  semiEmergency: "border-[#f3d8bc] bg-[#fffaf4] text-[#20283a] before:bg-[#e8b77f]",
  normal: "border-[#cedcf5] bg-[#fbfdff] text-[#20283a] before:bg-[#9eb8ea]",
};

const weeklyBadgeClass: Record<ReservationStatus, string> = {
  emergency: "bg-[#fdecee] text-[#c95f69]",
  semiEmergency: "bg-[#fff0df] text-[#c87832]",
  normal: "bg-[#edf4ff] text-[#4b76c8]",
};

function WeeklySchedule({
  selectedDate,
  reservations,
  patientsById,
  onSelectReservation,
}: {
  selectedDate: Date;
  reservations: ReservationItem[];
  patientsById: PatientsById;
  onSelectReservation: (reservation: ReservationItem, reservationDate: Date) => void;
}) {
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="px-4 pb-4">
      <section className="overflow-hidden rounded-lg border border-[#e5eaf2] bg-white shadow-sm">
        <div className="grid grid-cols-[70px_repeat(7,minmax(120px,1fr))] border-b border-[#e5eaf2]">
          <div className="border-r border-[#e5eaf2] bg-white" />
          {weekDays.map((day, index) => {
            const isToday = isSameDate(day, TODAY);
            const isSunday = day.getDay() === 0;

            return (
              <div
                key={day.toISOString()}
                className={[
                  "flex h-11 items-center justify-center gap-2 border-r border-[#e5eaf2] text-sm font-extrabold last:border-r-0",
                  isSunday ? "text-[#ef4444]" : "text-[#1d2a57]",
                ].join(" ")}
              >
                <span>
                  {String(day.getMonth() + 1).padStart(2, "0")}.
                  {String(day.getDate()).padStart(2, "0")} ({weekDayLabels[index]})
                </span>
                {isToday && (
                  <span className="rounded-full bg-[#0f62fe] px-2 py-0.5 text-xs text-white">
                    오늘
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {reservationTimes.map((time) => {
          const isLunch = time === "12:00";

          if (isLunch) {
            return (
              <div
                key={time}
                className="grid grid-cols-[70px_1fr] border-b border-[#edf1f6]"
              >
                <div className="border-r border-[#e5eaf2] px-3 py-2 text-sm font-extrabold text-[#1d2a57]">
                  12:00
                </div>
                <div className="flex h-9 items-center justify-center bg-[#f3f5f8] text-sm font-extrabold text-[#53617c]">
                  점심시간 (12:00 - 13:00)
                </div>
              </div>
            );
          }

          return (
            <div
              key={time}
              className="grid grid-cols-[70px_repeat(7,minmax(120px,1fr))] border-b border-[#edf1f6] last:border-b-0"
            >
              <div className="border-r border-[#e5eaf2] px-3 py-3 text-sm font-extrabold text-[#1d2a57]">
                {time}
              </div>
              {weekDays.map((day) => {
                const dayKey = getDateKey(day);
                const reservation = reservations.find(
                  (item) => item.date === dayKey && item.start === time
                );
                const patient = reservation
                  ? patientsById[reservation.patientId]
                  : undefined;

                return (
                  <div
                    key={`${day.toISOString()}-${time}`}
                    className="min-h-[54px] border-r border-[#edf1f6] p-1.5 last:border-r-0"
                  >
                    {reservation && patient ? (
                      <button
                        type="button"
                        onClick={() => onSelectReservation(reservation, day)}
                        className={`relative h-full min-h-[48px] w-full overflow-hidden rounded-lg border px-3 py-2 pl-4 text-left shadow-sm transition before:absolute before:left-0 before:top-0 before:h-full before:w-1 hover:-translate-y-0.5 ${weeklyCardClass[reservation.status]}`}
                      >
                        <p className="truncate text-[13px] font-extrabold">
                          {patient.petName} ({patient.guardianName})
                        </p>
                        <p className="mt-0.5 truncate text-xs font-extrabold">
                          {reservation.visitReason}
                        </p>
                        <span
                          className={`absolute bottom-1.5 right-2 rounded-md px-2 py-0.5 text-xs font-extrabold ${weeklyBadgeClass[reservation.status]}`}
                        >
                          {reservationStatusMeta[reservation.status].label}
                        </span>
                      </button>
                    ) : (
                      <div className="flex h-full min-h-[48px] items-center px-2 text-sm font-extrabold text-[#a4adbd]">
                        -
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>

      <Legend />
    </div>
  );
}

function Legend() {
  const items: Array<{ label: string; className: string }> = [
    { label: "응급", className: "bg-[#e7a6af]" },
    { label: "준응급", className: "bg-[#e8b77f]" },
    { label: "일반", className: "bg-[#9eb8ea]" },
    { label: "예약 없음", className: "bg-[#e7ebf2]" },
  ];

  return (
    <div className="mx-auto mt-3 flex w-fit items-center gap-7 rounded-lg border border-[#e5eaf2] bg-white px-6 py-2.5 shadow-sm">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm font-extrabold text-[#53617c]">
          <span className={`h-3 w-3 rounded-full ${item.className}`} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

const koreanHolidays: Record<string, string> = {
  "2026-01-01": "신정",
  "2026-02-16": "설날",
  "2026-02-17": "설날",
  "2026-02-18": "설날",
  "2026-03-01": "삼일절",
  "2026-03-02": "대체공휴일",
  "2026-05-01": "근로자의날",
  "2026-05-05": "어린이날",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "대체공휴일",
  "2026-06-03": "전국동시지방선거",
  "2026-06-06": "현충일",
  "2026-07-17": "제헌절",
  "2026-08-15": "광복절",
  "2026-08-17": "대체공휴일",
  "2026-09-24": "추석",
  "2026-09-25": "추석",
  "2026-09-26": "추석",
  "2026-10-03": "개천절",
  "2026-10-05": "대체공휴일",
  "2026-10-09": "한글날",
  "2026-12-25": "성탄절",
  "2027-01-01": "신정",
  "2027-02-06": "설날",
  "2027-02-07": "설날",
  "2027-02-08": "설날",
  "2027-02-09": "대체공휴일",
  "2027-03-01": "삼일절",
  "2027-05-01": "근로자의날",
  "2027-05-05": "어린이날",
  "2027-05-13": "부처님오신날",
  "2027-06-06": "현충일",
  "2027-07-17": "제헌절",
  "2027-08-15": "광복절",
  "2027-08-16": "대체공휴일",
  "2027-09-14": "추석",
  "2027-09-15": "추석",
  "2027-09-16": "추석",
  "2027-10-03": "개천절",
  "2027-10-04": "대체공휴일",
  "2027-10-09": "한글날",
  "2027-10-11": "대체공휴일",
  "2027-12-25": "성탄절",
  "2027-12-27": "대체공휴일",
};

function getHolidayName(date: Date) {
  return koreanHolidays[getDateKey(date)];
}

function MonthlyCalendar({
  selectedDate,
  reservations,
  onSelectDate,
}: {
  selectedDate: Date;
  reservations: ReservationItem[];
  onSelectDate: (date: Date) => void;
}) {
  const monthDays = getMonthGrid(selectedDate);

  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const reservation of reservations) {
      map[reservation.date] = (map[reservation.date] ?? 0) + 1;
    }
    return map;
  }, [reservations]);

  return (
    <div className="px-4 pb-4">
      <section className="overflow-hidden rounded-lg border border-[#e5eaf2] bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-[#e5eaf2]">
          {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
            <div
              key={day}
              className="flex h-10 items-center justify-center border-r border-[#e5eaf2] text-sm font-extrabold text-[#1d2a57] last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {monthDays.map((day) => {
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            const isToday = isSameDate(day, TODAY);
            const isSunday = day.getDay() === 0;
            const isSaturday = day.getDay() === 6;
            const holidayName = getHolidayName(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectDate(day)}
                className={[
                  "min-h-[96px] border-r border-b border-[#edf1f6] p-4 text-left transition hover:bg-[#f8fbff]",
                  isToday ? "border-[#0f62fe] ring-1 ring-[#0f62fe]" : "",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={[
                      "text-base font-extrabold",
                      !isCurrentMonth
                        ? "text-[#b8c0cf]"
                        : isSunday || holidayName
                          ? "text-[#ef4444]"
                          : isSaturday
                            ? "text-[#0f62fe]"
                            : "text-[#1d2a57]",
                    ].join(" ")}
                  >
                    {day.getDate()}
                  </span>
                  {holidayName && (
                    <span className="text-xs font-extrabold text-[#ef4444]">
                      {holidayName}
                    </span>
                  )}
                  {isToday && (
                    <span className="ml-auto rounded-full bg-[#0f62fe] px-2 py-0.5 text-xs font-extrabold text-white">
                      오늘
                    </span>
                  )}
                </div>
                <span
                  className={[
                    "mt-4 inline-flex rounded-lg px-3 py-1.5 text-sm font-extrabold",
                    isCurrentMonth
                      ? "bg-[#f5f8ff] text-[#1d2a57]"
                      : "bg-[#f7f8fa] text-[#a4adbd]",
                  ].join(" ")}
                >
                  총 {countByDate[getDateKey(day)] ?? 0}건
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-lg border border-[#e5eaf2] bg-white px-5 py-2.5 text-sm font-extrabold text-[#53617c] shadow-sm">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#0f62fe] text-xs text-[#0f62fe]">
          i
        </span>
        일별 예약 총 건수를 표시합니다.
      </div>
    </div>
  );
}

function DetailPanel({
  selectedDate,
  reservation,
  patient,
  onEdit,
  onCancel,
}: {
  selectedDate: Date;
  reservation?: ReservationItem;
  patient?: ReservationPatient;
  onEdit: () => void;
  onCancel: () => void;
}) {
  if (!reservation || !patient) {
    return (
      <section className="rounded-lg border border-[#e5eaf2] bg-white p-6 shadow-sm">
        <p className="text-sm font-bold text-[#778196]">예약을 선택해주세요.</p>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col rounded-lg border border-[#e5eaf2] bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-[#151b28]">예약 상세 정보</h2>
        <button type="button" className="text-[#53617c]" aria-label="상세 닫기">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <img
          src={patient.imageUrl}
          alt={patient.petName}
          className="h-20 w-20 rounded-lg object-cover"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="truncate text-base font-extrabold text-[#1d2a57]">
              {patient.petName} ({patient.guardianName})
            </h3>
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-extrabold ${reservationStatusMeta[reservation.status].badgeClass}`}
            >
              {reservationStatusMeta[reservation.status].label}
            </span>
            <span className="text-xl font-extrabold text-[#0f62fe]">
              {patient.gender === "남아" ? "♂" : "♀"}
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-[#53617c]">
            {patient.breed} ㅣ {patient.age} ㅣ {patient.weight}
          </p>
          <p className="mt-2 text-sm font-extrabold text-[#1d2a57]">
            {patient.phone}
          </p>
        </div>
      </div>

      <dl className="mt-7 space-y-4 text-sm">
        <DetailRow label="예약 날짜" value={formatDateWithWeekday(selectedDate)} />
        <DetailRow label="예약 시간" value={reservation.start} />
        <DetailRow label="진료 항목" value={reservation.visitReason} />
        <DetailRow label="담당 수의사" value={reservation.doctorName} />
        <DetailRow label="메모" value={reservation.memo} />
      </dl>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#0f62fe] text-sm font-extrabold text-[#0f62fe]"
        >
          <Pencil className="h-4 w-4" />
          수정
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#ef4444] text-sm font-extrabold text-[#ef4444]"
        >
          <Trash2 className="h-4 w-4" />
          삭제
        </button>
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 border-b border-[#edf1f6] pb-3">
      <dt className="font-extrabold text-[#53617c]">{label}</dt>
      <dd className="font-extrabold text-[#1d2a57]">{value}</dd>
    </div>
  );
}

interface ReservationFormState {
  date: string;
  dateKey: string;
  time: string;
  doctorName: string;
  memo: string;
}

function ReservationFormModal({
  mode,
  selectedDate,
  reservation,
  patient,
  patientOptions,
  doctorOptions,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  selectedDate: Date;
  reservation?: ReservationItem;
  patient?: ReservationPatient;
  patientOptions: ReservationPatient[];
  doctorOptions: string[];
  onClose: () => void;
  onSave: (patient: ReservationPatient, form: ReservationFormState) => void;
}) {
  const [searchText, setSearchText] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<ReservationPatient | null>(
    mode === "edit" ? patient ?? null : null
  );
  const [reservationDate, setReservationDate] = useState(selectedDate);
  const [form, setForm] = useState<ReservationFormState>({
    date: formatDateWithWeekday(selectedDate),
    dateKey: getDateKey(selectedDate),
    time: reservation?.start ?? "17:00",
    doctorName: reservation?.doctorName ?? doctorOptions[0] ?? "",
    memo: reservation?.memo ?? "",
  });

  const filteredPatients = useMemo(() => {
    const keyword = searchText.trim();
    if (!keyword) {
      return [];
    }

    return patientOptions.filter((item) =>
      `${item.petName} ${item.guardianName} ${item.phone}`.includes(keyword)
    );
  }, [searchText, patientOptions]);
  const shouldShowSearchResults = isSearchFocused && searchText.trim().length > 0;
  const canSaveReservation = selectedPatient !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/55 px-4 py-3">
      <div className="flex max-h-[94vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#edf1f6] px-5 py-3">
          <h2 className="text-base font-extrabold text-[#151b28]">
            예약 {mode === "add" ? "추가" : "수정"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4d5874] hover:bg-[#f3f6fb]"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="relative">
            <label className="mb-1.5 block text-xs font-extrabold text-[#1d2a57]">
              환자 검색
            </label>
            <div className="flex h-9 items-center rounded-lg border border-[#dfe6f1] px-3 focus-within:border-[#0f62fe]">
              <input
                value={searchText}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="강아지이름 / 전화번호 뒷자리 검색"
                className="min-w-0 flex-1 bg-transparent text-xs font-bold text-[#1d2a57] outline-none placeholder:text-[#a4adbd]"
              />
              <ChevronDown className="h-4 w-4 text-[#53617c]" />
            </div>
            {shouldShowSearchResults && (
              <div className="absolute left-0 right-0 top-[62px] z-10 overflow-hidden rounded-lg border border-[#edf1f6] bg-white shadow-lg">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(item);
                        setSearchText("");
                      }}
                      className="flex w-full items-center justify-between border-b border-[#f2f4f8] px-4 py-2.5 text-left last:border-b-0 hover:bg-[#f7f9fc]"
                    >
                      <span>
                        <span className="block text-sm font-extrabold text-[#1d2a57]">
                          {item.petName} ({item.guardianName})
                        </span>
                        <span className="mt-1 block text-xs font-bold text-[#8a94a6]">
                          {item.phone}
                        </span>
                      </span>
                      <span className="text-xs font-extrabold text-[#8a94a6]">
                        {item.species}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm font-bold text-[#8a94a6]">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>

          <section>
            <h3 className="mb-2 text-sm font-extrabold text-[#1d2a57]">
              정보 확인
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <ReadonlyField label="강아지 이름" value={selectedPatient?.petName ?? ""} />
              <ReadonlyField label="생년월일" value={selectedPatient?.birthDate ?? ""} />
              <ReadonlyField label="종" value={selectedPatient?.species ?? ""} />
              <ReadonlyField label="몸무게" value={selectedPatient?.weight ?? ""} />
              <ReadonlyField label="품종" value={selectedPatient?.breed ?? ""} />
              <ReadonlyField
                label="마지막 정기검진날"
                value={selectedPatient?.lastCheckupDate ?? ""}
              />
              <ReadonlyField label="성별" value={selectedPatient?.gender ?? ""} />
              <ReadonlyField
                label="중성화 여부"
                value={
                  selectedPatient
                    ? selectedPatient.isNeutered
                      ? "중성화 O"
                      : "중성화 X"
                    : ""
                }
              />
            </div>
          </section>

          <section className="border-t border-[#edf1f6] pt-3">
            <h3 className="mb-2 text-sm font-extrabold text-[#1d2a57]">
              예약 정보
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <DatePickerField
                label="예약 날짜"
                selectedDate={reservationDate}
                onSelectDate={(date) => {
                  setReservationDate(date);
                  setForm((current) => ({
                    ...current,
                    date: formatDateWithWeekday(date),
                    dateKey: getDateKey(date),
                  }));
                }}
              />
              <SelectField
                label="예약 시간"
                value={form.time}
                options={["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"]}
                onChange={(value) => setForm((current) => ({ ...current, time: value }))}
              />
              <SelectField
                label="담당 수의사"
                value={form.doctorName}
                options={doctorOptions}
                onChange={(value) =>
                  setForm((current) => ({ ...current, doctorName: value }))
                }
              />
            </div>
            <label className="mt-3 block text-xs font-extrabold text-[#1d2a57]">
              <span className="mb-1 block">메모</span>
              <span className="relative">
                <textarea
                  value={form.memo}
                  maxLength={200}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, memo: event.target.value }))
                  }
                  className="h-20 w-full resize-none rounded-lg border border-[#dfe6f1] px-3 py-2 text-xs font-bold text-[#1d2a57] outline-none focus:border-[#0f62fe]"
                />
                <span className="absolute bottom-3 right-3 text-xs font-extrabold text-[#8a94a6]">
                  {form.memo.length} / 200
                </span>
              </span>
            </label>
          </section>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-4 px-5 pb-5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#b8cdfc] text-sm font-extrabold text-[#1d2a57]"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canSaveReservation}
            onClick={() => {
              if (selectedPatient) {
                onSave(selectedPatient, form);
              }
            }}
            className="h-10 rounded-lg bg-[#0f62fe] text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#b8c0cf]"
          >
            예약 저장
          </button>
        </div>
      </div>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block min-w-0 text-xs font-extrabold text-[#1d2a57]">
      <span className="mb-1 block">{label}</span>
      <input
        readOnly
        value={value}
        className="h-8 w-full min-w-0 rounded-lg border border-[#edf1f6] bg-[#f8fafc] px-3 text-xs font-bold text-[#53617c] outline-none"
      />
    </label>
  );
}

function DatePickerField({
  label,
  selectedDate,
  onSelectDate,
}: {
  label: string;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0 });
  const calendarButtonRef = useRef<HTMLButtonElement | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const days = getMonthGrid(visibleMonth);

  const toggleCalendar = () => {
    const rect = calendarButtonRef.current?.getBoundingClientRect();

    if (rect) {
      const popoverWidth = 244;
      const left = Math.min(
        Math.max(12, rect.right - popoverWidth),
        window.innerWidth - popoverWidth - 12
      );
      setPopoverPosition({
        left,
        top: rect.bottom + 8,
      });
    }

    setIsOpen((open) => !open);
  };

  return (
    <label className="block min-w-0 text-xs font-extrabold text-[#1d2a57]">
      <span className="mb-1 block">{label}</span>
      <span className="flex h-8 min-w-0 items-center rounded-lg border border-[#dfe6f1] px-3">
        <input
          readOnly
          value={formatDateWithWeekday(selectedDate)}
          className="min-w-0 flex-1 cursor-default bg-transparent text-xs font-bold text-[#1d2a57] outline-none"
        />
        <button
          ref={calendarButtonRef}
          type="button"
          onClick={toggleCalendar}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#53617c] hover:bg-[#edf5ff] hover:text-[#0f62fe]"
          aria-label="예약 날짜 선택"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </span>

      {isOpen && (
        <div
          className="fixed z-[70] w-[244px] rounded-xl border border-[#dfe6f1] bg-white p-3 shadow-xl"
          style={{
            left: popoverPosition.left,
            top: popoverPosition.top,
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth((date) => addMonths(date, -1))}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#53617c] hover:bg-[#f3f6fb]"
              aria-label="이전 달"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-extrabold text-[#1d2a57]">
              {formatMonthTitle(visibleMonth)}
            </span>
            <button
              type="button"
              onClick={() => setVisibleMonth((date) => addMonths(date, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#53617c] hover:bg-[#f3f6fb]"
              aria-label="다음 달"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold text-[#8a94a6]">
            {dayLabels.map((day) => (
              <span key={day}>{day}</span>
            ))}
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const isSelected = isSameDate(day, selectedDate);
              const isToday = isSameDate(day, TODAY);
              const isHoliday = Boolean(getHolidayName(day));
              const isSunday = day.getDay() === 0;
              const isSaturday = day.getDay() === 6;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onSelectDate(day);
                    setVisibleMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                    setIsOpen(false);
                  }}
                  title={getHolidayName(day)}
                  className={[
                    "flex h-7 items-center justify-center rounded-md text-xs font-extrabold transition",
                    isSelected
                      ? "bg-[#0f62fe] text-white"
                      : isToday
                        ? "border border-[#0f62fe] text-[#0f62fe]"
                        : !isCurrentMonth
                          ? "text-[#c0c7d4]"
                          : isHoliday || isSunday
                            ? "text-[#ef4444] hover:bg-[#fff1f2]"
                            : isSaturday
                              ? "text-[#0f62fe] hover:bg-[#edf5ff]"
                              : "text-[#20283a] hover:bg-[#f3f6fb]",
                  ].join(" ")}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0 text-xs font-extrabold text-[#1d2a57]">
      <span className="mb-1 block">{label}</span>
      <span className="relative block min-w-0">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full appearance-none rounded-lg border border-[#dfe6f1] bg-white px-3 pr-8 text-xs font-bold text-[#1d2a57] outline-none focus:border-[#0f62fe]"
        >
          <option value="">선택</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2 h-4 w-4 text-[#53617c]" />
      </span>
    </label>
  );
}

function CancelReservationModal({
  patientName,
  onClose,
  onConfirm,
}: {
  patientName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#111827]/55 px-4">
      <div className="w-full max-w-[520px] rounded-2xl bg-white px-10 py-9 text-center shadow-2xl">
        <div className="relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-0 top-0 text-[#3f4960]"
            aria-label="닫기"
          >
            <X className="h-7 w-7" />
          </button>
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#f4b252] text-[#f4a62a]">
            <AlertTriangle className="h-10 w-10" />
          </div>
          <h2 className="mt-8 text-3xl font-extrabold text-[#20283a]">
            예약을 정말 취소하시겠습니까?
          </h2>
          <p className="mt-6 text-lg font-extrabold leading-8 text-[#9aa3b3]">
            {patientName}의 취소된 예약은 복구할 수 없습니다.
            <br />
            정말로 취소하시겠습니까?
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={onClose}
              className="h-14 rounded-lg border border-[#e4e9f1] text-lg font-extrabold text-[#6b7486]"
            >
              아니요
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="h-14 rounded-lg bg-[#ef4444] text-lg font-extrabold text-white"
            >
              네, 취소할게요
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#dfe6f1] bg-white text-[#53617c]"
    >
      {children}
    </button>
  );
}
