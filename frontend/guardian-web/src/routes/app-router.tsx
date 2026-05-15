import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import SignupPage from "../pages/guardian/signup-page";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/signup" replace />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;