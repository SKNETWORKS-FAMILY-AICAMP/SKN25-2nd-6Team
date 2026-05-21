import type {
  PatientDetailResponse,
  PatientListItemResponse,
} from "../api/patientApi";
import type {
  EmrHistoryRecord,
  PatientProfile,
} from "../types/patient";

export const speciesOptions = ["강아지", "고양이"];
export const editableSpeciesOptions = ["강아지", "고양이", "기타"];

export function normalizeDate(value: string) {
  return value.replace(/-/g, ".");
}

export function mapListItemToPatient(
  item: PatientListItemResponse
): PatientProfile {
  return {
    id: item.petid,
    petName: item.petname,
    species: "강아지",
    breed: item.breed,
    age: item.age,
    guardianName: item.owner_name,
    phone: item.phone,
    lastVisitDate: normalizeDate(item.last_visit_date),
    memo: item.memo,
    imageUrl:
      "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "-",
    guardianAddress: "-",
    guardianMemo: item.memo || "-",
    gender: "-",
    isNeutered: false,
    birthDate: "-",
    weight: "-",
    weightMeasuredAt: "-",
    notes: item.memo || "-",
  };
}

export function mapDetailToPatient(
  detail: PatientDetailResponse["result"]
): PatientProfile {
  const info = detail.patient_info;

  return {
    id: info.petid,
    petName: info.petname,
    species: info.species,
    breed: info.breed,
    age: info.age,
    guardianName: info.owner_name,
    phone: info.phone,
    lastVisitDate: detail.emr_history[0]?.visit_date
      ? normalizeDate(detail.emr_history[0].visit_date)
      : "-",
    memo: info.notes,
    imageUrl:
      info.profile_image ||
      "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "-",
    guardianAddress: "-",
    guardianMemo: info.notes,
    gender:
      info.gender === "female"
        ? "암컷"
        : info.gender === "male"
          ? "수컷"
          : info.gender,
    isNeutered: Boolean(info.is_neutered),
    birthDate: normalizeDate(info.birth_date),
    weight: `${info.weight_kg}kg`,
    weightMeasuredAt: detail.emr_history[0]?.visit_date
      ? normalizeDate(detail.emr_history[0].visit_date)
      : "-",
    notes: info.notes,
  };
}

export function mapDetailToHistory(
  detail: PatientDetailResponse["result"]
): EmrHistoryRecord[] {
  return detail.emr_history.map((record) => ({
    id: record.doctor_emrid,
    date: normalizeDate(record.visit_date),
    type: record.status === "vaccination" ? "prevention" : "treatment",
    doctorName: record.doctor_name,
    title: record.chief_complaint,
    soap: {
      subjective: record.soap.subjective,
      objective: record.soap.objective,
      assessment: record.soap.assessment,
      plan: record.soap.plan,
    },
    prescriptions: record.prescription.map((line) => ({
      name: line.drug_name,
      dose: line.dosage,
      method: line.frequency,
      duration: `${line.duration_days}일분`,
    })),
  }));
}
