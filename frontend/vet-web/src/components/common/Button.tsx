import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-[#2f7df6] text-white hover:bg-[#1a6de8]",
  secondary:
    "border border-[#dfe6f1] bg-white text-[#4d5874] hover:border-[#4a89ff] hover:text-[#2f7df6]",
  danger:
    "border border-[#ef4444] bg-white text-[#ef4444] hover:bg-[#fff1f2]",
  ghost: "text-[#4d5874] hover:bg-[#f3f6fb] hover:text-[#2f7df6]",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  icon: "h-9 w-9 p-0",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClass[variant],
        sizeClass[size],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
