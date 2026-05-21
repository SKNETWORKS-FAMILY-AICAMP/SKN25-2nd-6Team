import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchDoctorPatientDetail,
  fetchDoctorPatientList,
  getPatientApiErrorMessage,
} from "../api/patientApi";
import { getReservations } from "../api/reservationApi";
import type {
  ApiReservation,
  PatientsById,
  ReservationItem,
  ReservationPatient,
} from "../types/reservation";
import {
  mapApiReservations,
  mapPatientDetailToReservationPatient,
  mapPatientListItemToReservationPatient,
} from "../utils/reservationUtils";

export function useReservationData(accessToken: string) {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [patientsById, setPatientsById] = useState<PatientsById>({});
  const [patientOptionsById, setPatientOptionsById] = useState<PatientsById>({});
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

  const loadPatientOptions = useCallback(async () => {
    try {
      const firstPage = await fetchDoctorPatientList({
        accessToken,
        page: 1,
      });
      const totalPage = firstPage.pagination?.total_page ?? 1;
      const restPages =
        totalPage > 1
          ? await Promise.all(
              Array.from({ length: totalPage - 1 }, (_, index) =>
                fetchDoctorPatientList({
                  accessToken,
                  page: index + 2,
                })
              )
            )
          : [];
      const list = [firstPage, ...restPages].flatMap(
        (page) => page.patient_list ?? []
      );
      const optionsById: PatientsById = {};

      for (const item of list) {
        optionsById[item.petid] = mapPatientListItemToReservationPatient(item);
      }

      setPatientOptionsById(optionsById);
    } catch (error) {
      console.error("예약 환자 검색 목록 조회 실패:", error);
      alert(getPatientApiErrorMessage(error, "환자 검색 목록 조회에 실패했습니다."));
    }
  }, [accessToken]);

  const resolvePatientOption = useCallback(
    async (patient: ReservationPatient) => {
      try {
        const detail = await fetchDoctorPatientDetail({
          accessToken,
          petid: patient.id,
        });
        const resolvedPatient = mapPatientDetailToReservationPatient(
          detail,
          patient
        );

        setPatientOptionsById((current) => ({
          ...current,
          [resolvedPatient.id]: resolvedPatient,
        }));

        return resolvedPatient;
      } catch (error) {
        console.error("예약 환자 상세 조회 실패:", error);
        return patient;
      }
    },
    [accessToken]
  );

  useEffect(() => {
    loadReservations();
    loadPatientOptions();
  }, [loadPatientOptions, loadReservations]);

  const patientOptions = useMemo(
    () =>
      Object.values({ ...patientOptionsById, ...patientsById }).sort((a, b) =>
        a.petName.localeCompare(b.petName, "ko")
      ),
    [patientOptionsById, patientsById]
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

  return {
    reservations,
    patientsById,
    patientOptions,
    doctorOptions,
    isLoading,
    loadReservations,
    resolvePatientOption,
  };
}
