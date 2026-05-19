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

export const mockPatientProfiles: PatientProfile[] = [
  {
    id: 1,
    petName: "코코",
    species: "강아지",
    breed: "말티즈",
    age: "3세 2개월",
    guardianName: "김보호",
    phone: "010-1234-5678",
    lastVisitDate: "2024.03.10",
    memo: "알러지 있음",
    imageUrl:
      "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "guardian.kim@example.com",
    guardianAddress: "서울특별시 강남구 테헤란로 123",
    guardianMemo: "낯선 환경에서 긴장하는 편입니다.",
    gender: "수컷",
    isNeutered: true,
    birthDate: "2023.03.10",
    weight: "4.2kg",
    weightMeasuredAt: "2026.05.16",
    notes: "식이 알러지 의심. 닭고기 기반 사료 제한 권고.",
  },
  {
    id: 2,
    petName: "몽치",
    species: "강아지",
    breed: "이보로즈",
    age: "2세 1개월",
    guardianName: "이보호",
    phone: "010-2345-6789",
    lastVisitDate: "2024.03.05",
    memo: "피부 가려움",
    imageUrl:
      "https://images.unsplash.com/photo-1593134257782-e89567b7718a?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "lee.owner@example.com",
    guardianAddress: "서울특별시 송파구 올림픽로 210",
    guardianMemo: "야외 산책 후 발 핥음이 잦습니다.",
    gender: "암컷",
    isNeutered: false,
    birthDate: "2024.04.02",
    weight: "7.1kg",
    weightMeasuredAt: "2026.05.13",
    notes: "피부 발진 반복. 산책 후 발 세척 필요.",
  },
  {
    id: 3,
    petName: "나비",
    species: "고양이",
    breed: "포메라니안",
    age: "4세 0개월",
    guardianName: "박보호",
    phone: "010-3456-7890",
    lastVisitDate: "2024.02.28",
    memo: "심장 체크 필요",
    imageUrl:
      "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "park.owner@example.com",
    guardianAddress: "서울특별시 마포구 월드컵북로 55",
    guardianMemo: "이동장을 싫어해 내원 전 안정 시간이 필요합니다.",
    gender: "암컷",
    isNeutered: true,
    birthDate: "2022.05.01",
    weight: "4.8kg",
    weightMeasuredAt: "2026.05.08",
    notes: "청진 시 잡음 경미. 정기 심장 체크 예정.",
  },
  {
    id: 4,
    petName: "도리",
    species: "강아지",
    breed: "푸들",
    age: "3세 5개월",
    guardianName: "최보호",
    phone: "010-4567-8901",
    lastVisitDate: "2024.02.20",
    memo: "귀 염증 재발",
    imageUrl:
      "https://images.unsplash.com/photo-1601979031925-424e53b6caaa?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "choi.owner@example.com",
    guardianAddress: "서울특별시 서초구 서초대로 77",
    guardianMemo: "귀 세정 시 예민하게 반응합니다.",
    gender: "수컷",
    isNeutered: true,
    birthDate: "2022.12.04",
    weight: "5.6kg",
    weightMeasuredAt: "2026.05.02",
    notes: "외이염 재발 이력. 습도 관리 필요.",
  },
  {
    id: 5,
    petName: "모찌",
    species: "강아지",
    breed: "비숑 프리제",
    age: "2세 3개월",
    guardianName: "정보호",
    phone: "010-5678-9012",
    lastVisitDate: "2024.02.15",
    memo: "체중 관리 중",
    imageUrl:
      "https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "jung.owner@example.com",
    guardianAddress: "서울특별시 용산구 한강대로 88",
    guardianMemo: "간식 제한 중입니다.",
    gender: "암컷",
    isNeutered: true,
    birthDate: "2024.02.18",
    weight: "6.4kg",
    weightMeasuredAt: "2026.04.29",
    notes: "체중 증가 추세. 사료량 조절 안내.",
  },
  {
    id: 6,
    petName: "라떼",
    species: "강아지",
    breed: "시츄",
    age: "5세 1개월",
    guardianName: "정보호",
    phone: "010-6789-0123",
    lastVisitDate: "2024.02.10",
    memo: "슬개골 탈구",
    imageUrl:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "latte.owner@example.com",
    guardianAddress: "서울특별시 강동구 천호대로 98",
    guardianMemo: "계단 이용을 제한하고 있습니다.",
    gender: "수컷",
    isNeutered: false,
    birthDate: "2021.04.08",
    weight: "7.9kg",
    weightMeasuredAt: "2026.04.26",
    notes: "좌측 슬개골 탈구 2기. 재활 상담 예정.",
  },
  {
    id: 7,
    petName: "콩이",
    species: "강아지",
    breed: "닥스훈트",
    age: "1세 8개월",
    guardianName: "윤보호",
    phone: "010-7890-1234",
    lastVisitDate: "2024.02.05",
    memo: "예방접종 완료",
    imageUrl:
      "https://images.unsplash.com/photo-1612195583950-b8fd34c87093?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "yoon.owner@example.com",
    guardianAddress: "서울특별시 관악구 관악로 14",
    guardianMemo: "예약 시간보다 일찍 도착하는 편입니다.",
    gender: "수컷",
    isNeutered: true,
    birthDate: "2024.09.02",
    weight: "4.5kg",
    weightMeasuredAt: "2026.04.22",
    notes: "예방접종 스케줄 정상 진행 중.",
  },
  {
    id: 8,
    petName: "망고",
    species: "강아지",
    breed: "골든 리트리버",
    age: "4세 11개월",
    guardianName: "한보호",
    phone: "010-8901-2345",
    lastVisitDate: "2024.01.25",
    memo: "관절 영양제 복용",
    imageUrl:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "han.owner@example.com",
    guardianAddress: "서울특별시 성동구 왕십리로 31",
    guardianMemo: "대형견 진료실을 선호합니다.",
    gender: "암컷",
    isNeutered: true,
    birthDate: "2021.06.15",
    weight: "28.4kg",
    weightMeasuredAt: "2026.04.18",
    notes: "고관절 부담 완화를 위해 체중 유지 필요.",
  },
  {
    id: 9,
    petName: "두부",
    species: "고양이",
    breed: "웰시코기",
    age: "2세 7개월",
    guardianName: "오보호",
    phone: "010-9012-3456",
    lastVisitDate: "2024.01.20",
    memo: "식이 알러지",
    imageUrl:
      "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "oh.owner@example.com",
    guardianAddress: "서울특별시 중구 세종대로 40",
    guardianMemo: "처방식만 급여 중입니다.",
    gender: "암컷",
    isNeutered: true,
    birthDate: "2023.10.12",
    weight: "5.0kg",
    weightMeasuredAt: "2026.04.11",
    notes: "식이성 피부 반응 의심.",
  },
  {
    id: 10,
    petName: "봄이",
    species: "고양이",
    breed: "말티푸",
    age: "6세 2개월",
    guardianName: "강보호",
    phone: "010-0123-4567",
    lastVisitDate: "2024.01.15",
    memo: "치아 스케일링 필요",
    imageUrl:
      "https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "kang.owner@example.com",
    guardianAddress: "서울특별시 은평구 통일로 101",
    guardianMemo: "마취 전 검사 상담 요청.",
    gender: "수컷",
    isNeutered: true,
    birthDate: "2020.03.22",
    weight: "4.7kg",
    weightMeasuredAt: "2026.04.05",
    notes: "치석 축적. 스케일링 일정 조율 필요.",
  },
  {
    id: 11,
    petName: "별이",
    species: "고양이",
    breed: "코리안 숏헤어",
    age: "7세 4개월",
    guardianName: "김하나",
    phone: "010-1111-2222",
    lastVisitDate: "2026.03.28",
    memo: "만성 기침",
    imageUrl:
      "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "hana.kim@example.com",
    guardianAddress: "서울특별시 동작구 상도로 20",
    guardianMemo: "진료 중 보호자 동반 필요.",
    gender: "암컷",
    isNeutered: true,
    birthDate: "2019.01.14",
    weight: "5.8kg",
    weightMeasuredAt: "2026.03.28",
    notes: "호흡기 증상 경과 관찰 중.",
  },
  {
    id: 12,
    petName: "하루",
    species: "강아지",
    breed: "포메라니안",
    age: "1세 10개월",
    guardianName: "김하나",
    phone: "010-2222-3333",
    lastVisitDate: "2026.03.21",
    memo: "귀 염증",
    imageUrl:
      "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=360&q=80",
    guardianEmail: "haru.owner@example.com",
    guardianAddress: "서울특별시 강남구 논현로 12",
    guardianMemo: "미용 후 피부 발적이 잦습니다.",
    gender: "수컷",
    isNeutered: false,
    birthDate: "2024.07.01",
    weight: "3.1kg",
    weightMeasuredAt: "2026.03.21",
    notes: "외이도 발적. 재검 예정.",
  },
];

export const mockEmrHistoryByPatientId: Record<number, EmrHistoryRecord[]> = {
  1: [
    {
      id: 101,
      date: "2026.05.16",
      type: "treatment",
      doctorName: "김수의사",
      title: "구토, 식욕 저하, 무기력",
      soap: {
        subjective: "보호자 진술상 전날 저녁부터 구토 2회, 식욕 저하.",
        objective: "체온 38.7도, 심박수 120회/분, 호흡수 28회/분, 복부 촉진 시 경미한 압통.",
        assessment: "위장염 의심. 탈수는 경미한 수준.",
        plan: "수액 처치, 위장 보호제 처방, 24시간 식이 조절 권고.",
      },
      prescriptions: [
        { name: "항구토제 (마로피탄) 1 mg/kg", dose: "정량", method: "SID", duration: "3일분" },
        { name: "위장관 보호제 (수크랄페이트) 250 mg", dose: "1정", method: "BID", duration: "5일분" },
        { name: "프로바이오틱스", dose: "1캡슐", method: "SID", duration: "7일분" },
      ],
    },
    {
      id: 102,
      date: "2026.04.18",
      type: "treatment",
      doctorName: "김수의사",
      title: "피부 가려움",
      soap: {
        subjective: "산책 후 발 핥음과 긁음 증가.",
        objective: "발바닥 홍반, 긁은 자국 다수.",
        assessment: "알레르기성 피부염 의심.",
        plan: "항히스타민제 처방, 목욕 관리 권장.",
      },
      prescriptions: [
        { name: "항히스타민제 (세티리진) 1 mg/kg", dose: "정량", method: "SID", duration: "7일분" },
        { name: "오메가3 보조제", dose: "1캡슐", method: "SID", duration: "30일분" },
      ],
    },
    {
      id: 103,
      date: "2026.03.02",
      type: "prevention",
      doctorName: "김수의사",
      title: "예방접종 (종합백신)",
      soap: {
        plan: "DA2PP 종합백신 접종. 이상 반응 관찰 안내.",
      },
      prescriptions: [
        { name: "DA2PP 백신", dose: "1 dose", method: "IM", duration: "1회" },
      ],
    },
  ],
  2: [
    {
      id: 201,
      date: "2026.05.13",
      type: "treatment",
      doctorName: "이지수 수의사",
      title: "피부 가려움 상담",
      soap: {
        subjective: "발 핥음과 복부 긁음이 반복됨.",
        objective: "복부 발적, 피부 건조.",
        assessment: "환경성 알러지 가능성.",
        plan: "약욕 샴푸, 항히스타민제 처방, 2주 후 재검.",
      },
      prescriptions: [
        { name: "항히스타민제", dose: "1정", method: "SID", duration: "14일분" },
        { name: "약욕 샴푸", dose: "적당량", method: "외용", duration: "주 2회" },
      ],
    },
  ],
};
