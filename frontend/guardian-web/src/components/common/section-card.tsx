import type { ReactNode } from "react";

type SectionCardPadding = "default" | "none";

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  padding?: SectionCardPadding;
}

const paddingClassName: Record<SectionCardPadding, string> = {
  default: "p-8",
  none: "p-0",
};

const SectionCard = ({
  children,
  className = "",
  padding = "default",
}: SectionCardProps) => {
  return (
    <section
      className={[
        "rounded-3xl border border-slate-100 bg-white",
        paddingClassName[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
};

export default SectionCard;
