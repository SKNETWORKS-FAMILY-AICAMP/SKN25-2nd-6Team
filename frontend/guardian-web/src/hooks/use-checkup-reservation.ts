import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";

import {
  getAvailableScheduleSlots,
  reserveCheckupSchedule,
} from "../api/schedule-api";
import type {
  ApiErrorResponse,
  AvailableScheduleSlot,
  CheckupReservationResult,
} from "../types/schedule";

const checkupDurationMin = 30;

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (isAxiosError<ApiErrorResponse | string>(error)) {
    const responseData = error.response?.data;

    if (typeof responseData === "string") {
      try {
        return (
          (JSON.parse(responseData) as ApiErrorResponse).message ||
          fallbackMessage
        );
      } catch {
        return fallbackMessage;
      }
    }

    return responseData?.message || fallbackMessage;
  }

  return fallbackMessage;
};

interface UseCheckupReservationParams {
  petId: number;
}

export const useCheckupReservation = ({
  petId,
}: UseCheckupReservationParams) => {
  const [selectedDate, setSelectedDateState] = useState(() =>
    formatDateInput(new Date()),
  );
  const [selectedSlot, setSelectedSlot] =
    useState<AvailableScheduleSlot | null>(null);
  const [memo, setMemo] = useState("");
  const [availableSlots, setAvailableSlots] = useState<AvailableScheduleSlot[]>(
    [],
  );
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [completedReservation, setCompletedReservation] =
    useState<CheckupReservationResult | null>(null);

  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateState(date);
    setSelectedSlot(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadAvailableSlots = async () => {
      try {
        setIsLoadingSlots(true);
        setErrorMessage("");

        const response = await getAvailableScheduleSlots({
          date: selectedDate,
          duration_min: checkupDurationMin,
        });

        if (!isMounted) {
          return;
        }

        if (response.code !== 200) {
          setErrorMessage(
            response.message || "예약 가능한 시간을 불러오지 못했습니다.",
          );
          setAvailableSlots([]);
          return;
        }

        setAvailableSlots(response.result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          getErrorMessage(error, "예약 가능한 시간을 불러오지 못했습니다."),
        );
        setAvailableSlots([]);
      } finally {
        if (isMounted) {
          setIsLoadingSlots(false);
        }
      }
    };

    loadAvailableSlots();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const reserveCheckup = async () => {
    if (!selectedSlot) {
      setErrorMessage("예약 시간을 선택해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await reserveCheckupSchedule({
        pet_id: petId,
        date: selectedDate,
        time: selectedSlot.start_time,
        memo,
      });

      if (response.code !== 200 || !response.result) {
        setErrorMessage(response.message || "정기검진 예약에 실패했습니다.");
        return;
      }

      setCompletedReservation(response.result);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "정기검진 예약에 실패했습니다."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
};
