export type ReservationStatus = "emergency" | "semiEmergency" | "normal" | "checkup";

export interface ReservationPatient {
  id: number;
  petName: string;
  guardianName: string;
  phone: string;
  species: "강아지" | "고양이";
  breed: string;
  birthDate: string;
  age: string;
  weight: string;
  gender: "남아" | "여아";
  isNeutered: boolean;
  lastCheckupDate: string;
  imageUrl: string;
}

export interface ReservationItem {
  id: number;
  patientId: number;
  start: string;
  end: string;
  status: ReservationStatus;
  visitReason: string;
  doctorName: string;
  memo: string;
}

export const reservationStatusMeta: Record<
  ReservationStatus,
  { label: string; badgeClass: string; softClass: string }
> = {
  emergency: {
    label: "응급",
    badgeClass: "bg-[#fdecee] text-[#c95f69]",
    softClass: "bg-[#fdecee] text-[#c95f69]",
  },
  semiEmergency: {
    label: "준응급",
    badgeClass: "bg-[#fff0df] text-[#c87832]",
    softClass: "bg-[#fff0df] text-[#c87832]",
  },
  normal: {
    label: "일반",
    badgeClass: "bg-[#edf4ff] text-[#4b76c8]",
    softClass: "bg-[#edf4ff] text-[#4b76c8]",
  },
  checkup: {
    label: "검진",
    badgeClass: "bg-[#edf8f1] text-[#4b9a66]",
    softClass: "bg-[#edf8f1] text-[#4b9a66]",
  },
};

export const mockReservationPatients: ReservationPatient[] = [
  {
    id: 1,
    petName: "이나비",
    guardianName: "김지연",
    phone: "010-1234-5678",
    species: "강아지",
    breed: "말티즈",
    birthDate: "2020.04.12",
    age: "4세",
    weight: "2.8kg",
    gender: "여아",
    isNeutered: true,
    lastCheckupDate: "2024.02.15",
    imageUrl:
      "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: 2,
    petName: "백도리",
    guardianName: "박현수",
    phone: "010-5678-4321",
    species: "강아지",
    breed: "푸들",
    birthDate: "2019.08.22",
    age: "5세",
    weight: "5.1kg",
    gender: "남아",
    isNeutered: true,
    lastCheckupDate: "2024.03.03",
    imageUrl:
      "https://images.unsplash.com/photo-1593134257782-e89567b7718a?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: 3,
    petName: "보리",
    guardianName: "이수연",
    phone: "010-4321-5678",
    species: "강아지",
    breed: "웰시코기",
    birthDate: "2021.01.08",
    age: "3세",
    weight: "8.4kg",
    gender: "여아",
    isNeutered: false,
    lastCheckupDate: "2024.01.29",
    imageUrl:
      "https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: 4,
    petName: "종합검진",
    guardianName: "최민정",
    phone: "010-8765-4321",
    species: "고양이",
    breed: "코리안숏헤어",
    birthDate: "2020.10.02",
    age: "4세",
    weight: "4.1kg",
    gender: "남아",
    isNeutered: true,
    lastCheckupDate: "2023.12.18",
    imageUrl:
      "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: 5,
    petName: "코코",
    guardianName: "이정훈",
    phone: "010-1234-5678",
    species: "강아지",
    breed: "닥스훈트",
    birthDate: "2021.05.20",
    age: "3세",
    weight: "4.5kg",
    gender: "남아",
    isNeutered: true,
    lastCheckupDate: "2024.02.15",
    imageUrl:
      "https://images.unsplash.com/photo-1612195583950-b8fd34c87093?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: 6,
    petName: "쭈쭈",
    guardianName: "정인수",
    phone: "010-6543-9876",
    species: "강아지",
    breed: "비숑프리제",
    birthDate: "2022.06.10",
    age: "2세",
    weight: "3.2kg",
    gender: "여아",
    isNeutered: false,
    lastCheckupDate: "2024.04.03",
    imageUrl:
      "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: 7,
    petName: "공구름",
    guardianName: "김하나",
    phone: "010-7777-2819",
    species: "강아지",
    breed: "골든 리트리버",
    birthDate: "2018.12.04",
    age: "6세",
    weight: "21kg",
    gender: "남아",
    isNeutered: true,
    lastCheckupDate: "2024.01.12",
    imageUrl:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: 8,
    petName: "몽치",
    guardianName: "이정훈",
    phone: "010-9182-2234",
    species: "강아지",
    breed: "포메라니안",
    birthDate: "2022.02.02",
    age: "2세",
    weight: "2.9kg",
    gender: "남아",
    isNeutered: false,
    lastCheckupDate: "2024.02.20",
    imageUrl:
      "https://images.unsplash.com/photo-1587764379873-97837921fd44?auto=format&fit=crop&w=240&q=80",
  },
  {
    id: 9,
    petName: "별이",
    guardianName: "김하나",
    phone: "010-2323-7777",
    species: "강아지",
    breed: "보더콜리",
    birthDate: "2020.11.11",
    age: "4세",
    weight: "13kg",
    gender: "여아",
    isNeutered: true,
    lastCheckupDate: "2024.03.25",
    imageUrl:
      "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=240&q=80",
  },
];

export const mockReservations: ReservationItem[] = [
  {
    id: 101,
    patientId: 1,
    start: "09:00",
    end: "09:30",
    status: "emergency",
    visitReason: "기침 및 호흡 불편",
    doctorName: "이지수 수의사",
    memo: "최근 식욕 저하와 기침 증상이 있어 보호자 요청으로 우선 진료",
  },
  {
    id: 102,
    patientId: 2,
    start: "10:00",
    end: "10:30",
    status: "semiEmergency",
    visitReason: "구토 증상 내원",
    doctorName: "이지수 수의사",
    memo: "전날 밤 구토 2회. 간식 변경 이력 확인 필요",
  },
  {
    id: 103,
    patientId: 3,
    start: "11:00",
    end: "11:30",
    status: "normal",
    visitReason: "피부 가려움 상담",
    doctorName: "김수의 수의사",
    memo: "산책 후 발 핥음이 잦음",
  },
  {
    id: 104,
    patientId: 4,
    start: "13:00",
    end: "13:30",
    status: "checkup",
    visitReason: "정기 종합검진",
    doctorName: "강보호 수의사",
    memo: "혈액검사 및 구강 상태 확인 예정",
  },
  {
    id: 105,
    patientId: 6,
    start: "14:00",
    end: "14:30",
    status: "normal",
    visitReason: "예방접종",
    doctorName: "김수의 수의사",
    memo: "접종 후 알레르기 반응 관찰",
  },
  {
    id: 106,
    patientId: 7,
    start: "15:00",
    end: "15:30",
    status: "semiEmergency",
    visitReason: "다리 절뚝거림",
    doctorName: "이지수 수의사",
    memo: "산책 중 미끄러진 뒤 오른쪽 뒷다리 불편",
  },
  {
    id: 107,
    patientId: 8,
    start: "16:00",
    end: "16:30",
    status: "emergency",
    visitReason: "복통 의심",
    doctorName: "강보호 수의사",
    memo: "복부 촉진 민감. 이물 섭취 여부 확인",
  },
  {
    id: 108,
    patientId: 9,
    start: "17:00",
    end: "17:30",
    status: "normal",
    visitReason: "귀 염증 재진",
    doctorName: "김수의 수의사",
    memo: "지난 처방 후 호전 여부 확인",
  },
  {
    id: 109,
    patientId: 5,
    start: "17:00",
    end: "17:30",
    status: "semiEmergency",
    visitReason: "구토 증상 내원",
    doctorName: "이지수 수의사",
    memo: "최근 식욕 저하 및 구토 증상",
  },
];

export const reservationTimes = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export const doctorOptions = ["이지수 수의사", "김수의 수의사", "강보호 수의사"];

export const visitReasonOptions = [
  "구토 증상 내원",
  "기침 및 호흡 불편",
  "피부 가려움 상담",
  "정기 종합검진",
  "예방접종",
  "귀 염증 재진",
];
