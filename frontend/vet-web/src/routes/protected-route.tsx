import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthSession } from "../api/authApi";
import { AlarmProvider } from "../contexts/AlarmContext";

interface ProtectedRouteProps {
  session: AuthSession | null;
}

export default function ProtectedRoute({ session }: ProtectedRouteProps) {
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (session.user.isFirstLogin) {
    return <Navigate to="/first-password-change" replace />;
  }

  return (
    <AlarmProvider session={session}>
      <Outlet />
    </AlarmProvider>
  );
}
