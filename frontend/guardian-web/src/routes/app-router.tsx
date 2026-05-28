import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import FindIdPage from "../pages/auth/find-id-page";
import FindPasswordPage from "../pages/auth/find-password-page";
import LoginPage from "../pages/auth/login-page";
import SignupPage from "../pages/auth/signup-page";
import ChatbotPage from "../pages/chatbot/chatbot-page";
import ChangePasswordPage from "../pages/guardian/change-password-page";
import HomePage from "../pages/guardian/home-page";
import MypagePage from "../pages/guardian/mypage-page";
import ScheduleListPage from "../pages/guardian/schedule-list-page";
import PetRegisterPage from "../pages/pets/pet-register-page";
import ProtectedRoute from "./protected-route";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/find-id" element={<FindIdPage />} />
        <Route path="/find-password" element={<FindPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/reservations" element={<ScheduleListPage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/mypage" element={<MypagePage />} />
          <Route path="/mypage/password" element={<ChangePasswordPage />} />
          <Route path="/pets/register" element={<PetRegisterPage />} />
          <Route path="/pets/:petId" element={<PetRegisterPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
