import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import FindIdPage from "../pages/auth/find-id-page";
import FindPasswordPage from "../pages/auth/find-password-page";
import LoginPage from "../pages/auth/login-page";
import HomePage from "../pages/guardian/home-page";
import SignupPage from "../pages/guardian/signup-page";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/find-id" element={<FindIdPage />} />
        <Route path="/find-password" element={<FindPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
