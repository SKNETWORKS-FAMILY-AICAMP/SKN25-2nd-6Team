import { AlarmItem } from "./alarmApi";

export const mockAlarms: AlarmItem[] = [
  {
    alarmid: 1,
    type: "reservation_confirmed",
    contents: "코코 예약이 확정되었습니다.",
    scheduleid: 15,
    is_read: false,
    created_at: "2024-05-20 09:30:00",
  },
  {
    alarmid: 2,
    type: "reservation_cancelled",
    contents: "루이 예약이 취소되었습니다.",
    scheduleid: 17,
    is_read: false,
    created_at: "2024-05-20 10:10:00",
  },
  {
    alarmid: 3,
    type: "reservation_updated",
    contents: "뭉치 예약 시간이 수정되었습니다.",
    scheduleid: 21,
    is_read: false,
    created_at: "2024-05-20 11:00:00",
  },
  {
    alarmid: 4,
    type: "reservation_confirmed",
    contents: "나비 예약이 확정되었습니다.",
    scheduleid: 22,
    is_read: true,
    created_at: "2024-05-19 14:20:00",
  },
  {
    alarmid: 5,
    type: "reservation_cancelled",
    contents: "몽치 예약이 취소되었습니다.",
    scheduleid: 23,
    is_read: true,
    created_at: "2024-05-19 09:05:00",
  },
];
