import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "outlineBlue"
  | "outlineDanger";
type ActionButtonSize = "sm" | "md" | "lg";

interface ActionButtonProps {
  children: ReactNode;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  className?: string;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
}

const variantClassName: Record<ActionButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300",
  secondary:
    "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400",
  danger:
    "bg-rose-500 text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300",
  outlineBlue:
    "border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400",
  outlineDanger:
    "border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400",
};

const sizeClassName: Record<ActionButtonSize, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-sm",
};

const ActionButton = ({
  children,
  type = "button",
  disabled = false,
  onClick,
  className = "",
  variant = "primary",
  size = "md",
}: ActionButtonProps) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center rounded-xl font-black transition focus:outline-none focus:ring-4 focus:ring-blue-100",
        variantClassName[variant],
        sizeClassName[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
};

export default ActionButton;
