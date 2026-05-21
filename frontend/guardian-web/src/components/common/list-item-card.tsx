import type { ReactNode } from "react";

interface ListItemCardProps {
  children: ReactNode;
  className?: string;
}

const ListItemCard = ({ children, className = "" }: ListItemCardProps) => {
  return (
    <article
      className={[
        "rounded-2xl border border-slate-100 bg-white p-5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </article>
  );
};

export default ListItemCard;
