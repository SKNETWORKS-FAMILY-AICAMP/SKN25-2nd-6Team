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

export const mockWaitingQueue: QueuePatient[] = [
  {
    schedule_id: 101,
    time: "09:30",
    guardian_name: "김지연",
    pet_name: "뽀삐",
    species: "말티즈",
    triage_status: "emergency",
    source: "reservation",
  },
  {
    schedule_id: 102,
    time: "10:00",
    guardian_name: "박현수",
    pet_name: "루이",
    species: "푸들",
    triage_status: "semiEmergency",
    source: "reservation",
  },
  {
    schedule_id: 103,
    time: "10:30",
    guardian_name: "이수연",
    pet_name: "보리",
    species: "시바견",
    triage_status: "normal",
    source: "walk_in",
  },
  {
    schedule_id: 104,
    time: "11:00",
    guardian_name: "최민정",
    pet_name: "로빈",
    species: "말티즈",
    triage_status: "normal",
    source: "reservation",
  },
];

export const mockCompletedQueue: QueuePatient[] = [
  {
    schedule_id: 90,
    time: "09:00",
    guardian_name: "김하나",
    pet_name: "하루",
    species: "페르시안",
    triage_status: "normal",
    source: "reservation",
  },
];

export const mockEmrResponsesByScheduleId: Record<number, EmrResponse> = {
  101: {
    code: 200,
    result: {
      pet_info: {
        pet_id: 1,
        pet_name: "뽀삐",
        species: "말티즈",
        gender: "Female",
        weight_kg: 2.8,
        age: 4,
        birth_date: "2020.04.12",
        is_neutered: true,
        notes: "산책 때 풀을 자주 먹고, 알러지 반응이 종종 나타나요.",
        profile_image:
          "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=320&q=80",
        last_visit: "2024.04.10",
      },
      triage_summary: {
        summary: [
          "최근 2일 동안 기침이 있어요.",
          "식욕이 조금 떨어졌어요.",
          "특이사항: 산책 후 풀을 자주 먹는 경향이 있습니다.",
        ],
        attachments: [
          "https://images.unsplash.com/photo-1597633425046-08f5110420b5?auto=format&fit=crop&w=320&q=80",
          "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=320&q=80",
          "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=320&q=80",
          "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=320&q=80",
          "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=320&q=80",
        ],
      },
      emr_history: [
        {
          emr_id: 1,
          date: "2024.04.10",
          doctor_name: "강수의 (원장)",
          vet_memo:
            "기침 증상으로 내원. 청진상 기관지염 걸음 확인. 네뷸라이저 치료 및 약물 처방. 다음주 재진 예약.",
          prescriptions: [
            {
              drug_name: "클라벳 시럽",
              dosage: "5ml",
              form: "PO",
              frequency: "SID",
              duration_days: 7,
            },
            {
              drug_name: "보호렉스정",
              dosage: "1/2T",
              form: "PO",
              frequency: "SID",
              duration_days: 5,
            },
          ],
        },
        {
          emr_id: 2,
          date: "2024.04.03",
          doctor_name: "강수의 (원장)",
          vet_memo:
            "피부 가려움으로 내원. 알러지 검사 결과 확인. 오메가3 급여 권장.",
          prescriptions: [
            {
              drug_name: "오메가3",
              dosage: "1알",
              form: "PO",
              frequency: "SID",
              duration_days: 30,
            },
          ],
        },
      ],
    },
  },
  102: {
    code: 200,
    result: {
      pet_info: {
        pet_id: 2,
        pet_name: "루이",
        species: "푸들",
        gender: "Male",
        weight_kg: 5.1,
        age: 6,
        birth_date: "2018.09.03",
        is_neutered: true,
        notes: "최근 간식 변경 후 구토가 잦아졌어요.",
        profile_image:
          "https://images.unsplash.com/photo-1597633425046-08f5110420b5?auto=format&fit=crop&w=320&q=80",
        last_visit: "2024.02.14",
      },
      triage_summary: {
        summary: [
          "구토 2회, 식욕 감소 1일째입니다.",
          "활동성은 약간 저하되어 있습니다.",
          "최근 새 간식을 먹기 시작했습니다.",
        ],
        attachments: [
          "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=320&q=80",
          "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=320&q=80",
        ],
      },
      emr_history: [
        {
          emr_id: 3,
          date: "2024.02.14",
          doctor_name: "이수의",
          vet_memo: "예방접종 및 기본 신체검사. 특이 소견 없음.",
          prescriptions: [],
        },
      ],
    },
  },
  103: {
    code: 200,
    result: {
      pet_info: {
        pet_id: 3,
        pet_name: "보리",
        species: "시바견",
        gender: "Female",
        weight_kg: 9.4,
        age: 3,
        birth_date: "2021.06.22",
        is_neutered: false,
        notes: "워크인 환자. 보호자가 산책 중 다리를 저는 모습을 확인.",
        profile_image:
          "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=320&q=80",
        last_visit: "첫 내원",
      },
      triage_summary: {
        summary: [],
        memo: "워크인 메모: 오전 산책 이후 오른쪽 앞다리를 들고 걷는 모습. 외상 가능성 확인 필요.",
        attachments: [],
      },
      emr_history: [],
    },
  },
  104: {
    code: 200,
    result: {
      pet_info: {
        pet_id: 4,
        pet_name: "로빈",
        species: "말티즈",
        gender: "Male",
        weight_kg: 3.2,
        age: 2,
        birth_date: "2022.11.01",
        is_neutered: false,
        notes: "눈물 자국이 심하고 귀를 자주 긁어요.",
        profile_image:
          "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=320&q=80",
        last_visit: "2024.01.07",
      },
      triage_summary: {
        summary: [
          "눈물 증가와 귀 가려움이 있습니다.",
          "식욕과 활동성은 정상입니다.",
        ],
        attachments: [
          "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=320&q=80",
        ],
      },
      emr_history: [],
    },
  },
};

export const mockUploadedFiles: UploadedFile[] = [
  {
    id: 1,
    label: "흉부 X-ray",
    url: "https://images.unsplash.com/photo-1583912267550-d44cdd7d880c?auto=format&fit=crop&w=320&q=80",
  },
  {
    id: 2,
    label: "슬관절 X-ray",
    url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=320&q=80",
  },
  {
    id: 3,
    label: "초음파",
    url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=320&q=80",
  },
];

export const mockAutoPrescriptions: Prescription[] = [
  {
    drug_name: "클라벳 시럽",
    dosage: "5ml",
    form: "PO",
    frequency: "BID",
    duration_days: 7,
  },
  {
    drug_name: "보호렉스정",
    dosage: "1/2T",
    form: "PO",
    frequency: "SID",
    duration_days: 5,
  },
  {
    drug_name: "유산균",
    dosage: "1포",
    form: "PO",
    frequency: "SID",
    duration_days: 10,
  },
];

const prescriptionProductInfo: Record<
  string,
  { quantity: string; product_name: string }
> = {
  "클라벳 시럽": {
    quantity: "1개 (120ml)",
    product_name: "Clavacillin®",
  },
  보호렉스정: {
    quantity: "1개 (6정)",
    product_name: "Boromex Tab®",
  },
  유산균: {
    quantity: "1개 (30포)",
    product_name: "Probiotics Vet®",
  },
};

export function createMockPrescriptionDocument(params: {
  pet: PetInfo;
  prescriptions: Prescription[];
}): PrescriptionDocumentResponse {
  return {
    code: 200,
    result: {
      issued_at: "2024년 05월 20일",
      issue_number: "2024-0520-001",
      valid_days: 7,
      pet: {
        name: params.pet.pet_name,
        species: params.pet.species === "말티즈" || params.pet.species === "푸들" || params.pet.species === "시바견" ? "개" : params.pet.species,
        gender: `${params.pet.gender === "Female" ? "암" : "수"} / ${params.pet.age}살 / ${params.pet.weight_kg}kg / 임신 여부 해당없음`,
        owner_name: "김수이",
        birth_date: params.pet.birth_date.replace(/\./g, "-"),
      },
      hospital: {
        name: "medipaw 동물병원",
        phone: "02-1234-5678",
        business_number: "123-45-67890",
        address: "마릿수: 총 1마리",
      },
      doctor: {
        name: "김수의",
        license_number: "12345",
      },
      prescriptions: params.prescriptions.map((prescription) => {
        const productInfo = prescriptionProductInfo[prescription.drug_name] ?? {
          quantity: "1개",
          product_name: "-",
        };

        return {
          ingredient: prescription.drug_name,
          dosage: prescription.dosage,
          frequency: `${prescription.form} ${prescription.frequency}`,
          duration_days: prescription.duration_days,
          quantity: productInfo.quantity,
          product_name: productInfo.product_name,
        };
      }),
    },
  };
}
