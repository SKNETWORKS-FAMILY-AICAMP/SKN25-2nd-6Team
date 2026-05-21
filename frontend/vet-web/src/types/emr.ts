export type QueueTab = "waiting" | "completed";

export interface PreviewImage {
  url: string;
  label: string;
}

export type IntakeApplyTarget = "summary" | "memo" | "all";

export type TriageStatus = "emergency" | "semiEmergency" | "normal";

export interface QueuePatient {
  schedule_id: number;
  time: string;
  guardian_name: string;
  pet_name: string;
  species: string;
  triage_status: TriageStatus;
  source: "reservation" | "walk_in";
}

export interface PetInfo {
  pet_id: number;
  pet_name: string;
  species: string;
  gender: "Female" | "Male";
  weight_kg: number;
  age: number;
  birth_date: string;
  is_neutered: boolean;
  notes: string;
  profile_image: string;
  last_visit: string;
}

export interface TriageSummary {
  summary: string[];
  attachments: string[];
  memo?: string;
}

export interface Prescription {
  drug_name: string;
  dosage: string;
  form: string;
  frequency: string;
  duration_days: number;
}

export interface PrescriptionDocumentResponse {
  code: 200;
  result: {
    issued_at: string;
    issue_number: string;
    valid_days: number;
    pet: {
      name: string;
      species: string;
      gender: string;
      owner_name: string;
      birth_date: string;
    };
    hospital: {
      name: string;
      phone: string;
      business_number: string;
      address: string;
    };
    doctor: {
      name: string;
      license_number: string;
    };
    prescriptions: Array<{
      ingredient: string;
      dosage: string;
      frequency: string;
      duration_days: number;
      quantity: string;
      product_name: string;
    }>;
  };
}

export interface EmrHistory {
  emr_id: number;
  date: string;
  doctor_name: string;
  vet_memo: string;
  prescriptions: Prescription[];
}

export interface EmrResult {
  pet_info: PetInfo;
  triage_summary: TriageSummary;
  emr_history: EmrHistory[];
}

export interface EmrResponse {
  code: 200;
  result: EmrResult;
}

export interface UploadedFile {
  id: number;
  url: string;
  label: string;
}
