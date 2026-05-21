import type { ReactNode } from "react";

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded-lg border border-[#e4e9f1] bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}
