import type { ReactNode } from "react";

function IconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function ChevronLeftIcon() {
  return (
    <IconBase>
      <path d="m15 18-6-6 6-6" />
    </IconBase>
  );
}

export function ChevronRightIcon() {
  return (
    <IconBase>
      <path d="m9 18 6-6-6-6" />
    </IconBase>
  );
}

export function CalendarMiniIcon() {
  return (
    <IconBase>
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4 8h16" />
      <path d="M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" />
    </IconBase>
  );
}

export function FilterIcon() {
  return (
    <IconBase>
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </IconBase>
  );
}

export function ClinicRoomIcon() {
  return (
    <IconBase>
      <path d="M5 21V8l7-5 7 5v13" />
      <path d="M9 21v-6h6v6" />
      <path d="M10 10h4" />
      <path d="M12 8v4" />
    </IconBase>
  );
}
