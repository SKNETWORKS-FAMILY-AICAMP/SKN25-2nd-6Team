import type { ReactNode } from "react";

import GuardianNavbar from "../components/guardian-navbar";

interface GuardianLayoutProps {
  children: ReactNode;
}

const GuardianLayout = ({ children }: GuardianLayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <GuardianNavbar />

      <main className="mx-auto w-full max-w-[1280px] px-8 pb-12 pt-10">
        {children}
      </main>
    </div>
  );
};

export default GuardianLayout;
