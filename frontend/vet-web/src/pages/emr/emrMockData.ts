import type {
  EmrResponse,
  PetInfo,
  Prescription,
  PrescriptionDocumentResponse,
  QueuePatient,
  TriageStatus,
  UploadedFile,
} from "../../types/emr";

type EmrMockVisitType = "emergency" | "semiEmergency" | "normal" | "checkup";

interface EmrMockScheduleItem {
  id: number;
  start: string;
  patientName: string;
  breed: string;
  age: string;
  weight: string;
  reason: string;
  type: EmrMockVisitType;
}

const mockScheduleItems: EmrMockScheduleItem[] = [
  {
    id: 1,
    start: "09:00",
    patientName: "이나비",
    breed: "샴",
    age: "2세",
    weight: "4.2kg",
    reason: "감기 증상",
    type: "emergency",
  },
  {
    id: 2,
    start: "10:00",
    patientName: "백도리",
    breed: "골든 리트리버",
    age: "2세",
    weight: "18.5kg",
    reason: "피부 질환",
    type: "semiEmergency",
  },
  {
    id: 3,
    start: "11:00",
    patientName: "보리",
    breed: "코리안 숏헤어",
    age: "5세",
    weight: "5.1kg",
    reason: "예방접종",
    type: "normal",
  },
  {
    id: 4,
    start: "12:00",
    patientName: "종합검진",
    breed: "포메라니안",
    age: "4세",
    weight: "3.4kg",
    reason: "정기 건강검진",
    type: "checkup",
  },
  {
    id: 5,
    start: "14:00",
    patientName: "쭈쭈",
    breed: "말티즈",
    age: "4세",
    weight: "3.7kg",
    reason: "귀 염증",
    type: "normal",
  },
  {
    id: 6,
    start: "15:00",
    patientName: "콩구름",
    breed: "비숑 프리제",
    age: "3세",
    weight: "6.0kg",
    reason: "구토, 식욕 저하",
    type: "semiEmergency",
  },
  {
    id: 7,
    start: "16:00",
    patientName: "몽치",
    breed: "포메라니안",
    age: "1세",
    weight: "2.8kg",
    reason: "슬개골 탈구",
    type: "emergency",
  },
  {
    id: 8,
    start: "17:00",
    patientName: "별이",
    breed: "시츄",
    age: "7세",
    weight: "6.2kg",
    reason: "만성 기침",
    type: "normal",
  },
];

const guardiansByPatientName: Record<string, string> = {
  이나비: "김지연",
  백도리: "박현수",
  보리: "이수연",
  종합검진: "최민정",
  쭈쭈: "정인수",
  콩구름: "김하나",
  몽치: "이정훈",
  별이: "김하나",
};

const profileImagesByPatientName: Record<string, string> = {
  이나비:
    "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?auto=format&fit=crop&w=320&q=80",
  백도리:
    "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=320&q=80",
  보리:
    "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=320&q=80",
  종합검진:
    "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=320&q=80",
  쭈쭈:
    "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=320&q=80",
  콩구름:
    "https://images.unsplash.com/photo-1597633425046-08f5110420b5?auto=format&fit=crop&w=320&q=80",
  몽치:
    "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=320&q=80",
  별이:
    "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=320&q=80",
};

function mapVisitTypeToTriageStatus(type: EmrMockVisitType): TriageStatus {
  if (type === "emergency" || type === "semiEmergency") {
    return type;
  }

  return "normal";
}

function parseAge(age: string) {
  const parsedAge = Number.parseInt(age, 10);
  return Number.isNaN(parsedAge) ? 1 : parsedAge;
}

function createEmrResponseFromSchedule(item: EmrMockScheduleItem): EmrResponse {
  const guardianName = guardiansByPatientName[item.patientName] ?? "보호자";

  return {
    code: 200,
    result: {
      pet_info: {
        pet_id: item.id,
        pet_name: item.patientName,
        species: item.breed,
        gender: item.id % 2 === 0 ? "Male" : "Female",
        weight_kg: Number.parseFloat(item.weight),
        age: parseAge(item.age),
        birth_date: `202${Math.max(0, 6 - parseAge(item.age))}.01.08`,
        is_neutered: item.id % 2 === 0,
        notes: `${guardianName} 보호자. 오늘 내원 사유는 ${item.reason}입니다.`,
        profile_image:
          profileImagesByPatientName[item.patientName] ??
          "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=320&q=80",
        last_visit: "2024.03.10",
      },
      triage_summary: {
        summary: [
          `${item.reason} 사유로 ${item.start} 예약 내원했습니다.`,
          `${item.breed}, ${item.age}, ${item.weight} 기본 정보를 확인했습니다.`,
          "보호자 문진 후 신체검사와 필요 처치를 진행할 예정입니다.",
        ],
        attachments: [
          profileImagesByPatientName[item.patientName] ??
            "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=320&q=80",
        ],
      },
      emr_history: [
        {
          emr_id: item.id,
          date: "2024.03.10",
          doctor_name: "김보호",
          vet_memo: `${item.reason} 관련 이전 진료 기록입니다. 증상 경과 확인 후 필요 시 처방을 조정했습니다.`,
          prescriptions:
            item.type === "checkup"
              ? []
              : [
                  {
                    drug_name: "기본 처방약",
                    dosage: "1T",
                    form: "PO",
                    frequency: "SID",
                    duration_days: 5,
                  },
                ],
        },
      ],
    },
  };
}

export const mockWaitingQueue: QueuePatient[] = mockScheduleItems.map((item) => ({
  schedule_id: item.id,
  time: item.start,
  guardian_name: guardiansByPatientName[item.patientName] ?? "보호자",
  pet_name: item.patientName,
  species: item.breed,
  triage_status: mapVisitTypeToTriageStatus(item.type),
  source: "reservation",
}));

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
  ...mockScheduleItems.reduce<Record<number, EmrResponse>>((acc, item) => {
    acc[item.id] = createEmrResponseFromSchedule(item);
    return acc;
  }, {}),
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
