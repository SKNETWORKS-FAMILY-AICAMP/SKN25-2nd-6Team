import ListItemCard from "../common/list-item-card";

const ScheduleSkeleton = () => {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <ListItemCard
          key={index}
          className="grid animate-pulse grid-cols-[76px_1fr_200px_150px] items-center gap-6"
        >
          <div className="h-16 w-16 rounded-full bg-slate-100" />
          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-slate-100" />
            <div className="h-5 w-24 rounded bg-slate-100" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-32 rounded bg-slate-100" />
            <div className="h-4 w-44 rounded bg-slate-100" />
          </div>
          <div className="space-y-3">
            <div className="h-7 w-20 rounded-full bg-slate-100" />
            <div className="h-9 w-32 rounded bg-slate-100" />
          </div>
        </ListItemCard>
      ))}
    </div>
  );
};

export default ScheduleSkeleton;