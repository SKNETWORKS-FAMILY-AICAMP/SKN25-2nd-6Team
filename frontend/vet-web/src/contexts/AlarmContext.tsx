import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { AlarmItem, fetchAlarmList, markAllAlarmsRead } from "../api/alarmApi";
import { mockAlarms } from "../api/alarmMockData";
import { AuthSession } from "../api/authApi";

interface AlarmContextValue {
  alarms: AlarmItem[];
  hasUnread: boolean;
  isMarkingRead: boolean;
  markAllRead: () => Promise<void>;
}

const AlarmContext = createContext<AlarmContextValue>({
  alarms: [],
  hasUnread: false,
  isMarkingRead: false,
  markAllRead: async () => {},
});

export function AlarmProvider({
  session,
  children,
}: {
  session: AuthSession;
  children: ReactNode;
}) {
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  useEffect(() => {
    fetchAlarmList({ accessToken: session.accessToken })
      .then(setAlarms)
      .catch(() => setAlarms([...mockAlarms]));
  }, [session.accessToken]);

  const markAllRead = async () => {
    setIsMarkingRead(true);
    try {
      await markAllAlarmsRead({ accessToken: session.accessToken });
    } catch {
      // API 실패해도 로컬 상태는 반영
    } finally {
      setAlarms((prev) => prev.map((a) => ({ ...a, is_read: true })));
      setIsMarkingRead(false);
    }
  };

  return (
    <AlarmContext.Provider
      value={{ alarms, hasUnread: alarms.some((a) => !a.is_read), isMarkingRead, markAllRead }}
    >
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarms() {
  return useContext(AlarmContext);
}
