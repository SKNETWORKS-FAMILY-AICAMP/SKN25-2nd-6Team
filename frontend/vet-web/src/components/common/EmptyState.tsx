interface EmptyStateProps {
  text: string;
  className?: string;
}

export function EmptyState({ text, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-1 items-center justify-center py-24 text-sm font-extrabold text-[#7a8599] ${className}`}
    >
      {text}
    </div>
  );
}
