export type EmrRecordType = "treatment" | "prevention";

export interface PatientSummary {
  id: number;
  petName: string;
  species: "강아지" | "고양이";
  breed: string;
  age: string;
  guardianName: string;
  phone: string;
  lastVisitDate: string;
  memo: string;
}

export interface PatientProfile extends PatientSummary {
  imageUrl: string;
  guardianEmail: string;
  guardianAddress: string;
  guardianMemo: string;
  gender: string;
  isNeutered: boolean;
  birthDate: string;
  weight: string;
  weightMeasuredAt: string;
  notes: string;
}

export interface PrescriptionLine {
  name: string;
  dose: string;
  method: string;
  duration: string;
}

export interface EmrHistoryRecord {
  id: number;
  date: string;
  type: EmrRecordType;
  doctorName: string;
  title: string;
  soap: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  prescriptions: PrescriptionLine[];
}

