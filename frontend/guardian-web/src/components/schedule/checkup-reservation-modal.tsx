import React, { useRef } from "react";

import type { Pet } from "../../api/pets-api";
import ActionButton from "../common/action-button";
import { useCheckupReservation } from "../../hooks/use-checkup-reservation";

interface CheckupReservationModalProps {
  pet: Pet;
  onClose: () => void;
}

type PetWithOptionalName = Pet & {
  name?: string;
};

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
    <path
      d="m6 6 12 12M18 6 6 18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const getPetMeta = (pet: Pet) =>
  [pet.breed || pet.species, pet.age ? `${pet.age}살` : undefined]
    .filter(Boolean)
    .join(" · ");

const CheckupReservationModal = ({
  pet,
  onClose,
}: CheckupReservationModalProps) => {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const {
    selectedDate,
    selectedSlot,
    memo,
    availableSlots,
    isLoadingSlots,
    isSubmitting,
    errorMessage,
    completedReservation,
    setSelectedDate,
    setSelectedSlot,
    setMemo,
    reserveCheckup,
  } = useCheckupReservation({ petId: pet.pet_id });
  const petDisplayName =
    completedReservation?.pet_name ?? (pet as PetWithOptionalName).name ?? pet.petname;

  const handleOpenDatePicker = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      if (dateInputRef.current) {
        if (typeof dateInputRef.current.showPicker === "function") {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      }
    } catch (error) {
      console.warn("showPicker failed, falling back to focus:", error);
      dateInputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4 py-4">
      <section className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 sm:px-6">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              바로 예약
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="정기검진 예약 모달 닫기"
          >
            <CloseIcon />
          </button>
        </div>

        {completedReservation ? (
          <div className="px-5 py-5 sm:px-6">
            <div className="rounded-2xl bg-blue-50 px-5 py-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">
                ✓
              </div>
              <h3 className="mt-3 text-xl font-black text-slate-950">
                예약이 완료되었습니다
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                예약 일정이 확정되었습니다.
              </p>
            </div>

            <dl className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">
              {[
                ["반려동물", petDisplayName],
                ["예약 날짜", completedReservation.date],
                [
                  "예약 시간",
                  `${completedReservation.time} - ${completedReservation.end_time}`,
                ],
                ["예약 메모", completedReservation.memo || "없음"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[92px_1fr] gap-4 py-3 text-sm"
                >
                  <dt className="font-black text-slate-500">{label}</dt>
                  <dd className="font-bold text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex justify-end">
              <ActionButton type="button" onClick={onClose} size="lg">
                홈으로 가기
              </ActionButton>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              reserveCheckup();
            }}
          >
            <div className="space-y-4 px-5 py-4 sm:px-6">
              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="truncate text-base font-black text-slate-950">
                  {pet.petname}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {getPetMeta(pet) || "반려동물"}
                </p>
              </div>

              <label className="block">
                <span className="text-sm font-black text-slate-900">
                  예약 날짜
                </span>
                <div className="mt-1.5 flex items-center rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    ref={dateInputRef}
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="h-11 flex-1 cursor-pointer bg-transparent text-sm font-bold text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleOpenDatePicker}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                    aria-label="달력 열기"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </button>
                </div>
              </label>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-slate-900">
                    가능한 시간
                  </h3>
                  <p className="text-xs font-bold text-slate-400">
                    {selectedDate}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {isLoadingSlots ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-10 animate-pulse rounded-xl bg-slate-100"
                      />
                    ))
                  ) : availableSlots.length > 0 ? (
                    availableSlots.map((slot) => {
                      const isSelected =
                        selectedSlot?.start_time === slot.start_time;

                      return (
                        <button
                          key={`${slot.start_time}-${slot.end_time}`}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={[
                            "h-10 rounded-xl border text-sm font-black transition",
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-blue-100 text-blue-600 hover:bg-blue-50",
                          ].join(" ")}
                        >
                          {slot.start_time}
                        </button>
                      );
                    })
                  ) : (
                    <p className="col-span-3 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500 sm:col-span-4">
                      예약 가능한 시간이 없습니다.
                    </p>
                  )}
                </div>
              </section>

              <label className="block">
                <span className="text-sm font-black text-slate-900">
                  예약 메모
                </span>
                <textarea
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  placeholder="검진 전 전달할 내용을 입력해주세요."
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              {errorMessage ? (
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
                  {errorMessage}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-3.5 sm:px-6">
              <ActionButton
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                variant="secondary"
              >
                닫기
              </ActionButton>
              <ActionButton
                type="submit"
                disabled={!selectedSlot || isSubmitting}
                className="min-w-[112px]"
              >
                {isSubmitting ? "예약 중" : "예약하기"}
              </ActionButton>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default CheckupReservationModal;
