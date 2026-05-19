import React, { useEffect, useState } from "react";
import LoginPage from "./pages/auth/LoginPage";
import FirstPasswordChangePage from "./pages/auth/FirstPasswordChangePage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import EmrPage from "./pages/emr/EmrPage";
import PatientManagementPage from "./pages/patients/PatientManagementPage";
import ReservationPage from "./pages/reservation/ReservationPage";
import SettingsPage from "./pages/settings/SettingsPage";
import { AuthSession, clearSession, getSavedSession } from "./api/authApi";
import { AppMenuId } from "./layouts/AppLayout";
import { AlarmProvider } from "./contexts/AlarmContext";

const devSession: AuthSession = {
  accessToken: "dev-preview-token",
  lastLoginAt: new Date().toISOString(),
  user: {
    id: "dev-vet",
    name: "김보호",
    hospitalName: "MediPaw 동물병원",
    role: "VETERINARIAN",
    isFirstLogin: false,
  },
};

function getDevPage() {
  const devPage = new URLSearchParams(window.location.search).get("devPage");

  if (devPage === "home" || devPage === "dashboard") {
    return "dashboard";
  }

  if (devPage === "emr") {
    return "emr";
  }

  if (devPage === "reservation") {
    return "reservation";
  }

  if (devPage === "patients") {
    return "patients";
  }

  if (devPage === "settings") {
    return "settings";
  }

  return null;
}

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentPage, setCurrentPage] = useState<
    | "login"
    | "first-password-change"
    | "dashboard"
    | "emr"
    | "reservation"
    | "patients"
    | "settings"
  >("login");

  useEffect(() => {
    const devPage = getDevPage();

    if (devPage) {
      setSession(devSession);
      setCurrentPage(devPage);
      return;
    }

    const savedSession = getSavedSession();

    if (!savedSession) {
      return;
    }

    setSession(savedSession);
    setCurrentPage("dashboard");
  }, []);

  const handleLoginSuccess = (nextSession: AuthSession) => {
    setSession(nextSession);
    setCurrentPage(
      nextSession.user.isFirstLogin ? "first-password-change" : "dashboard"
    );
  };

  const handleGoLogin = () => {
    clearSession();
    setSession(null);
    setCurrentPage("login");
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setCurrentPage("login");
    window.history.replaceState(null, "", window.location.pathname);
  };

  const handleNavigate = (menuId: AppMenuId) => {
    if (menuId === "home") {
      setCurrentPage("dashboard");
      window.history.replaceState(null, "", "?devPage=home");
      return;
    }

    if (menuId === "emr") {
      setCurrentPage("emr");
      window.history.replaceState(null, "", "?devPage=emr");
      return;
    }

    if (menuId === "reservation") {
      setCurrentPage("reservation");
      window.history.replaceState(null, "", "?devPage=reservation");
      return;
    }

    if (menuId === "patients") {
      setCurrentPage("patients");
      window.history.replaceState(null, "", "?devPage=patients");
      return;
    }

    if (menuId === "settings") {
      setCurrentPage("settings");
      window.history.replaceState(null, "", "?devPage=settings");
    }
  };

  if (currentPage === "first-password-change" && session?.user.isFirstLogin) {
    return (
      <FirstPasswordChangePage
        session={session}
        onPasswordChanged={(changedSession) => {
          setSession(changedSession);
          setCurrentPage("dashboard");
        }}
        onGoLogin={handleGoLogin}
      />
    );
  }

  if (session && !session.user.isFirstLogin) {
    return (
      <AlarmProvider session={session}>
        {currentPage === "dashboard" && (
          <DashboardPage session={session} onLogout={handleLogout} onNavigate={handleNavigate} />
        )}
        {currentPage === "emr" && (
          <EmrPage session={session} onLogout={handleLogout} onNavigate={handleNavigate} />
        )}
        {currentPage === "reservation" && (
          <ReservationPage session={session} onLogout={handleLogout} onNavigate={handleNavigate} />
        )}
        {currentPage === "patients" && (
          <PatientManagementPage session={session} onLogout={handleLogout} onNavigate={handleNavigate} />
        )}
        {currentPage === "settings" && (
          <SettingsPage session={session} onLogout={handleLogout} onNavigate={handleNavigate} />
        )}
      </AlarmProvider>
    );
  }

  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
}

export default App;
