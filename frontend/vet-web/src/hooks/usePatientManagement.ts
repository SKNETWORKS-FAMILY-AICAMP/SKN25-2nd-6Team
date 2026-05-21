import { useEffect, useState } from "react";
import {
  fetchDoctorPatientDetail,
  fetchDoctorPatientList,
} from "../api/patientApi";
import type {
  EmrHistoryRecord,
  PatientProfile,
} from "../types/patient";
import {
  mapDetailToHistory,
  mapDetailToPatient,
  mapListItemToPatient,
} from "../utils/patientUtils";

export function usePatientManagement(accessToken: string) {
  const [searchValue, setSearchValue] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagePatients, setPagePatients] = useState<PatientProfile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<EmrHistoryRecord[]>([]);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadPatients = async () => {
      setIsLoading(true);
      try {
        const result = await fetchDoctorPatientList({
          accessToken,
          page: currentPage,
          keyword: searchValue.trim(),
          species: selectedSpecies === "all" ? undefined : selectedSpecies,
        });

        if (!isMounted) {
          return;
        }

        setPagePatients(result.patient_list.map(mapListItemToPatient));
        setTotalCount(result.total_count ?? result.patient_list.length);
        setTotalPages(result.pagination?.total_page ?? 1);
      } catch (error) {
        console.error(error);

        setPagePatients([]);
        setTotalCount(0);
        setTotalPages(1);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPatients();

    return () => {
      isMounted = false;
    };
  }, [accessToken, currentPage, listRefreshKey, searchValue, selectedSpecies]);

  const updateSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const updateSpecies = (value: string) => {
    setSelectedSpecies(value);
    setCurrentPage(1);
  };

  const handleOpenDetail = async (patient: PatientProfile) => {
    try {
      const detail = await fetchDoctorPatientDetail({
        accessToken,
        petid: patient.id,
      });

      setSelectedPatient(mapDetailToPatient(detail));
      setSelectedHistory(mapDetailToHistory(detail));
    } catch (error) {
      console.error("환자 상세 조회 실패:", error);
    }
  };

  const closeDetail = () => {
    setSelectedPatient(null);
    setSelectedHistory([]);
  };

  const handleSaved = (updated: PatientProfile) => {
    setSelectedPatient(updated);
    setListRefreshKey((prev) => prev + 1);
  };

  return {
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
  };
}
