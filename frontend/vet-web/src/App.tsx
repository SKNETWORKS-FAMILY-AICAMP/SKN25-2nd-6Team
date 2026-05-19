import React, { useEffect, useState } from "react";
import LoginPage from "./pages/auth/LoginPage";
import FirstPasswordChangePage from "./pages/auth/FirstPasswordChangePage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import EmrPage from "./pages/emr/EmrPage";
import { AuthSession, clearSession, getSavedSession } from "./api/authApi";
import { AppMenuId } from "./layouts/AppLayout";

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentPage, setCurrentPage] = useState<
    "login" | "first-password-change" | "dashboard" | "emr"
  >("login");

  useEffect(() => {
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
  };

  const handleNavigate = (menuId: AppMenuId) => {
    if (menuId === "home") {
      setCurrentPage("dashboard");
      return;
    }

    if (menuId === "emr") {
      setCurrentPage("emr");
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

  if (currentPage === "dashboard" && session && !session.user.isFirstLogin) {
    return (
      <DashboardPage
        session={session}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    );
  }

  if (currentPage === "emr" && session && !session.user.isFirstLogin) {
    return (
      <EmrPage
        session={session}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
    );
  }

  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
}

export default App;
