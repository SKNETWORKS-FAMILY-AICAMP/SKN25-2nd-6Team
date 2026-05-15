import React, { useEffect, useState } from "react";
import LoginPage from "./pages/auth/LoginPage";
import FirstPasswordChangePage from "./pages/auth/FirstPasswordChangePage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import { AuthSession, getSavedSession } from "./api/authApi";

function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [currentPage, setCurrentPage] = useState<
    "login" | "first-password-change" | "dashboard"
  >("login");

  useEffect(() => {
    const savedSession = getSavedSession();

    if (!savedSession) {
      return;
    }

    setSession(savedSession);
    setCurrentPage(
      savedSession.user.isFirstLogin ? "first-password-change" : "dashboard"
    );
  }, []);

  const handleLoginSuccess = (nextSession: AuthSession) => {
    setSession(nextSession);
    setCurrentPage(
      nextSession.user.isFirstLogin ? "first-password-change" : "dashboard"
    );
  };

  const handleGoLogin = () => {
    setCurrentPage("login");
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
    return <DashboardPage session={session} />;
  }

  return <LoginPage onLoginSuccess={handleLoginSuccess} />;
}

export default App;
