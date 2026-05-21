import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  rightAction?: ReactNode;
}

const PageHeader = ({ title, description, rightAction }: PageHeaderProps) => {
  return (
    <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-black text-slate-950">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {rightAction}
    </section>
  );
};

export default PageHeader;
