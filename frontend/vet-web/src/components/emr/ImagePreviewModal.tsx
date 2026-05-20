import { X } from "lucide-react";

export function ImagePreviewModal({
  image,
  onClose,
}: {
  image: { url: string; label: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/60 px-4">
      <div className="w-full max-w-[760px] rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf1f6] px-5 py-4">
          <h2 className="text-base font-extrabold text-[#151b28]">
            {image.label}
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-[#59657a]" />
          </button>
        </div>
        <div className="bg-[#0f172a] p-4">
          <img
            src={image.url}
            alt={image.label}
            className="mx-auto max-h-[70vh] rounded-lg object-contain"
          />
        </div>
      </div>
    </div>
  );
}
