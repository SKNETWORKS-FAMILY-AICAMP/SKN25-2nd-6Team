export type VisitType = "emergency" | "semiEmergency" | "normal" | "checkup";

export interface ScheduleItem {
  id: number;
  start: string;
  end: string;
  patientName: string;
  species: string;
  breed: string;
  age: string;
  weight: string;
  reason: string;
  type: VisitType;
}

export interface PatientCard {
  id: number;
  name: string;
  species: string;
  breed: string;
  age: string;
  weight: string;
  appointmentTime: string;
  imageUrl: string;
}

export interface DashboardSummary {
  id: "total" | "waiting" | "emergency" | "completed";
  label: string;
  value: number;
  tone: "blue" | "orange" | "red" | "green";
}

export const mockDashboardSummaries: DashboardSummary[] = [
  {
    id: "total",
    label: "전체 예약",
    value: 8,
    tone: "blue",
  },
  {
    id: "waiting",
    label: "대기 중",
    value: 5,
    tone: "orange",
  },
  {
    id: "emergency",
    label: "응급",
    value: 0,
    tone: "red",
  },
  {
    id: "completed",
    label: "진료 완료",
    value: 3,
    tone: "green",
  },
];

export const mockScheduleItems: ScheduleItem[] = [
  {
    id: 1,
    start: "09:00",
    end: "09:30",
    patientName: "이나비",
    species: "고양이",
    breed: "샴",
    age: "2세",
    weight: "4.2kg",
    reason: "감기 증상",
    type: "emergency",
  },
  {
    id: 2,
    start: "10:00",
    end: "10:30",
    patientName: "백도리",
    species: "강아지",
    breed: "골든 리트리버",
    age: "2세",
    weight: "18.5kg",
    reason: "피부 질환",
    type: "semiEmergency",
  },
  {
    id: 3,
    start: "11:00",
    end: "11:30",
    patientName: "보리",
    species: "고양이",
    breed: "코리안 숏헤어",
    age: "5세",
    weight: "5.1kg",
    reason: "예방접종",
    type: "normal",
  },
  {
    id: 4,
    start: "12:00",
    end: "12:30",
    patientName: "종합검진",
    species: "강아지",
    breed: "포메라니안",
    age: "4세",
    weight: "3.4kg",
    reason: "정기 건강검진",
    type: "checkup",
  },
  {
    id: 5,
    start: "14:00",
    end: "14:30",
    patientName: "쭈쭈",
    species: "말티즈",
    breed: "말티즈",
    age: "4세",
    weight: "3.7kg",
    reason: "귀 염증",
    type: "normal",
  },
  {
    id: 6,
    start: "15:00",
    end: "15:30",
    patientName: "콩구름",
    species: "강아지",
    breed: "비숑 프리제",
    age: "3세",
    weight: "6.0kg",
    reason: "구토, 식욕 저하",
    type: "semiEmergency",
  },
  {
    id: 7,
    start: "16:00",
    end: "16:30",
    patientName: "몽치",
    species: "강아지",
    breed: "포메라니안",
    age: "1세",
    weight: "2.8kg",
    reason: "슬개골 탈구",
    type: "emergency",
  },
  {
    id: 8,
    start: "17:00",
    end: "17:30",
    patientName: "별이",
    species: "고양이",
    breed: "시츄",
    age: "7세",
    weight: "6.2kg",
    reason: "만성 기침",
    type: "normal",
  },
];

export const mockTodayPatients: PatientCard[] = [
  {
    id: 1,
    name: "이나비",
    species: "고양이",
    breed: "샴",
    age: "2세",
    weight: "4.2kg",
    appointmentTime: "09:00",
    imageUrl:
      "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?auto=format&fit=crop&w=320&q=80",
  },
  {
    id: 2,
    name: "백도리",
    species: "강아지",
    breed: "골든 리트리버",
    age: "2세",
    weight: "18.5kg",
    appointmentTime: "10:00",
    imageUrl:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=320&q=80",
  },
  {
    id: 3,
    name: "보리",
    species: "고양이",
    breed: "코리안 숏헤어",
    age: "5세",
    weight: "5.1kg",
    appointmentTime: "11:00",
    imageUrl:
      "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=320&q=80",
  },
  {
    id: 4,
    name: "쭈쭈",
    species: "강아지",
    breed: "말티즈",
    age: "4세",
    weight: "3.7kg",
    appointmentTime: "12:00",
    imageUrl:
      "https://images.unsplash.com/photo-1583511655826-05700d52f4d9?auto=format&fit=crop&w=320&q=80",
  },
  {
    id: 5,
    name: "콩구름",
    species: "강아지",
    breed: "비숑 프리제",
    age: "3세",
    weight: "6.0kg",
    appointmentTime: "15:00",
    imageUrl:
      "https://images.unsplash.com/photo-1597633425046-08f5110420b5?auto=format&fit=crop&w=320&q=80",
  },
  {
    id: 6,
    name: "몽치",
    species: "강아지",
    breed: "포메라니안",
    age: "1세",
    weight: "2.8kg",
    appointmentTime: "16:00",
    imageUrl:
      "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=320&q=80",
  },
  {
    id: 7,
    name: "별이",
    species: "고양이",
    breed: "러시안 블루",
    age: "7세",
    weight: "6.2kg",
    appointmentTime: "17:00",
    imageUrl:
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=320&q=80",
  },
  {
    id: 8,
    name: "초코",
    species: "강아지",
    breed: "푸들",
    age: "6세",
    weight: "5.8kg",
    appointmentTime: "17:30",
    imageUrl:
      "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=320&q=80",
  },
];
