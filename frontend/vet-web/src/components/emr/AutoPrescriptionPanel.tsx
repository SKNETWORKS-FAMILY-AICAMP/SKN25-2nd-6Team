import { Maximize2, X } from "lucide-react";
import type { PetInfo, Prescription } from "../../types/emr";
import { Panel } from "./EmrShared";

export function AutoPrescriptionPanel({
  patient,
  prescriptions,
  onClose,
  onLoad,
  onOpenPreview,
}: {
  patient?: PetInfo;
  prescriptions: Prescription[];
  onClose: () => void;
  onLoad: () => void;
  onOpenPreview: () => void;
}) {
  return (
    <Panel className="sticky top-[88px] h-[calc(100vh-104px)] self-start overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-lg font-extrabold text-[#151b28]">자동 처방전</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPreview}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe6f1] text-[#4d5874] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
            aria-label="처방전 미리보기"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#4d5874]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="space-y-4 px-5">
        {patient && (
          <p className="text-sm font-extrabold text-[#4d5874]">
            {patient.pet_name} {patient.gender === "Female" ? "♀" : "♂"} (
            {patient.species}, {patient.weight_kg}kg, {patient.age}살)
          </p>
        )}

        <div className="overflow-hidden rounded-lg border border-[#e8edf4]">
          <table className="w-full text-left">
            <thead className="bg-[#f7f9fc] text-xs font-extrabold text-[#697386]">
              <tr>
                <th className="px-3 py-3">약제명</th>
                <th className="px-2 py-3">형태</th>
                <th className="px-2 py-3">투여 방법</th>
                <th className="px-2 py-3">기간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#edf1f6]">
              {prescriptions.map((prescription) => (
                <tr
                  key={prescription.drug_name}
                  className="text-xs font-bold text-[#4d5874]"
                >
                  <td className="px-3 py-3 font-extrabold text-[#20283a]">
                    {prescription.drug_name}
                  </td>
                  <td className="px-2 py-3">{prescription.dosage}</td>
                  <td className="px-2 py-3">
                    {prescription.form} {prescription.frequency}
                  </td>
                  <td className="px-2 py-3">
                    {prescription.duration_days}일
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-[#edf1f6] bg-white p-4">
        <button
          type="button"
          onClick={onLoad}
          className="h-10 flex-1 rounded-lg border border-[#dfe6f1] text-sm font-extrabold text-[#4d5874]"
        >
          불러오기
        </button>
        <button className="h-10 flex-1 rounded-lg bg-[#4a89ff] text-sm font-extrabold text-white">
          적용
        </button>
      </div>
    </Panel>
  );
}
