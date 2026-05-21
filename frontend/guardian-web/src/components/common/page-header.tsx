import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  rightAction?: ReactNode;
}

const PageHeader = ({
  title,
  description,
  rightAction,
}: PageHeaderProps) => {
  return (
    <section className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-black text-slate-950">{title}</h1>

        {description ? (
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {rightAction}
    </section>
  );
};

export default PageHeader;