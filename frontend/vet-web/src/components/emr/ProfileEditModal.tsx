import { X } from "lucide-react";
import type { PetInfo } from "../../types/emr";

export function ProfileEditModal({
  patient,
  onClose,
}: {
  patient: PetInfo;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 px-4">
      <div className="w-full max-w-[520px] rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf1f6] px-5 py-4">
          <h2 className="text-lg font-extrabold text-[#151b28]">
            환자 정보 수정
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X className="h-5 w-5 text-[#59657a]" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 px-5 py-5">
          <ProfileInput label="이름" value={patient.pet_name} />
          <ProfileInput label="종류" value={patient.species} />
          <ProfileInput label="성별" value={patient.gender} />
          <ProfileInput label="체중" value={`${patient.weight_kg}kg`} />
          <ProfileInput label="나이" value={`${patient.age}살`} />
          <ProfileInput label="생년월일" value={patient.birth_date} />
          <label className="col-span-2">
            <span className="mb-2 block text-sm font-extrabold text-[#4d5874]">
              특이사항
            </span>
            <textarea
              defaultValue={patient.notes}
              className="h-24 w-full resize-none rounded-lg border border-[#dfe6f1] px-3 py-2 text-sm font-bold text-[#20283a] outline-none focus:border-[#4a89ff]"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf1f6] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#dfe6f1] px-4 text-sm font-extrabold text-[#59657a]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg bg-[#4a89ff] px-4 text-sm font-extrabold text-white"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileInput({ label, value }: { label: string; value: string }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-extrabold text-[#4d5874]">
        {label}
      </span>
      <input
        defaultValue={value}
        className="h-10 w-full rounded-lg border border-[#dfe6f1] px-3 text-sm font-bold text-[#20283a] outline-none focus:border-[#4a89ff]"
      />
    </label>
  );
}
