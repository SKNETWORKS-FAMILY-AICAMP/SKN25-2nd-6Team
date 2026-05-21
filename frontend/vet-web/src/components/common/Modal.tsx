import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  maxWidthClassName?: string;
}

export function Modal({
  title,
  children,
  onClose,
  footer,
  maxWidthClassName = "max-w-[560px]",
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`flex max-h-[88vh] w-full flex-col rounded-2xl bg-white shadow-2xl ${maxWidthClassName}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#e5eaf2] px-6 py-4">
          <h2 className="text-lg font-extrabold text-[#151b28]">{title}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-3 border-t border-[#e5eaf2] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
