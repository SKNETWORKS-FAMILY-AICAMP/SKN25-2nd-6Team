import type {
  PetInfo,
  Prescription,
  PrescriptionDocumentResponse,
} from "../../types/emr";

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
        species:
          params.pet.species === "말티즈" ||
          params.pet.species === "푸들" ||
          params.pet.species === "시바견"
            ? "개"
            : params.pet.species,
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
