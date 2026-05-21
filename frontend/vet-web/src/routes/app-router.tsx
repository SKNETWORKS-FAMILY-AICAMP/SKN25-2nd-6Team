import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { AuthSession } from "../api/authApi";
import { AppMenuId } from "../layouts/AppLayout";
import FirstPasswordChangePage from "../pages/auth/FirstPasswordChangePage";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import EmrPage from "../pages/emr/EmrPage";
import PatientManagementPage from "../pages/patients/PatientManagementPage";
import ReservationPage from "../pages/reservation/ReservationPage";
import SettingsPage from "../pages/settings/SettingsPage";
import { useAuthStore } from "../stores/auth-store";
import ProtectedRoute from "./protected-route";

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

const menuPathMap: Record<AppMenuId, string> = {
  home: "/home",
  emr: "/emr",
  reservation: "/reservation",
  patients: "/patients",
  settings: "/settings",
};

function getDevPath(search: string) {
  const devPage = new URLSearchParams(search).get("devPage");

  if (devPage === "home" || devPage === "dashboard") {
    return "/home";
  }

  if (devPage === "emr") {
    return "/emr";
  }

  if (devPage === "reservation") {
    return "/reservation";
  }

  if (devPage === "patients") {
    return "/patients";
  }

  if (devPage === "settings") {
    return "/settings";
  }

  return null;
}

function VetRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, setSession, clearAuth } = useAuthStore();

  useEffect(() => {
    const devPath = getDevPath(location.search);

    if (!devPath) {
      return;
    }

    setSession(devSession, { persist: false });
    navigate(devPath, { replace: true });
  }, [location.search, navigate, setSession]);

  const handleLoginSuccess = (nextSession: AuthSession) => {
    setSession(nextSession);
    navigate(
      nextSession.user.isFirstLogin ? "/first-password-change" : "/home",
      { replace: true }
    );
  };

  const handlePasswordChanged = (changedSession: AuthSession) => {
    setSession(changedSession);
    navigate("/home", { replace: true });
  };

  const handleGoLogin = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  const handleNavigate = (menuId: AppMenuId) => {
    navigate(menuPathMap[menuId]);
  };

  const protectedPageProps = {
    session: session!,
    onLogout: handleLogout,
    onNavigate: handleNavigate,
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={session ? "/home" : "/login"} replace />}
      />
      <Route
        path="/login"
        element={
          session && !session.user.isFirstLogin ? (
            <Navigate to="/home" replace />
          ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} />
          )
        }
      />
      <Route
        path="/first-password-change"
        element={
          session ? (
            session.user.isFirstLogin ? (
              <FirstPasswordChangePage
                session={session}
                onPasswordChanged={handlePasswordChanged}
                onGoLogin={handleGoLogin}
              />
            ) : (
              <Navigate to="/home" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route element={<ProtectedRoute session={session} />}>
        <Route
          path="/home"
          element={<DashboardPage {...protectedPageProps} />}
        />
        <Route
          path="/dashboard"
          element={<Navigate to="/home" replace />}
        />
        <Route path="/emr" element={<EmrPage {...protectedPageProps} />} />
        <Route
          path="/reservation"
          element={<ReservationPage {...protectedPageProps} />}
        />
        <Route
          path="/patients"
          element={<PatientManagementPage {...protectedPageProps} />}
        />
        <Route
          path="/settings"
          element={<SettingsPage {...protectedPageProps} />}
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to={session ? "/home" : "/login"} replace />}
      />
    </Routes>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <VetRoutes />
    </BrowserRouter>
  );
}
