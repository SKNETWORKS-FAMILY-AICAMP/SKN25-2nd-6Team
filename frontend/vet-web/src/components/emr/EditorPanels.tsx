import { AlignLeft, Bold, FileUp, Italic, List, Plus, Search, Trash2, Underline, X } from "lucide-react";
import type { Prescription, UploadedFile } from "../../pages/emr/emrMockData";
import { Panel } from "./EmrShared";

export function EditorPanel({
  value,
  count,
  onChange,
  onCompleteVisit,
}: {
  value: string;
  count: number;
  onChange: (value: string) => void;
  onCompleteVisit: () => void;
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-[#edf1f6] px-5 py-3">
        <h2 className="text-base font-extrabold text-[#151b28]">
          현재 진료 내용 입력
        </h2>
        <button
          type="button"
          onClick={onCompleteVisit}
          className="h-9 rounded-lg bg-[#16a34a] px-4 text-sm font-extrabold text-white transition hover:bg-[#13863f]"
        >
          진료 완료
        </button>
      </div>
      <div className="flex items-center gap-2 border-b border-[#edf1f6] px-5 py-2 text-[#4d5874]">
        <select className="h-8 rounded-md border border-[#dfe6f1] px-2 text-xs font-bold outline-none">
          <option>Pretendard</option>
        </select>
        <select className="h-8 rounded-md border border-[#dfe6f1] px-2 text-xs font-bold outline-none">
          <option>14</option>
        </select>
        {[Bold, Italic, Underline, AlignLeft, List].map((Icon) => (
          <button
            key={Icon.displayName}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-[#edf5ff] hover:text-[#2f7df6]"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
      <div className="px-5 py-4">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="진료 내용을 입력하세요..."
          className="h-32 w-full resize-none rounded-lg border border-[#dfe6f1] px-4 py-3 text-sm font-bold leading-6 text-[#20283a] outline-none transition placeholder:text-[#a8b0bf] focus:border-[#4a89ff] focus:ring-4 focus:ring-[#edf5ff]"
        />
        <p className="mt-2 text-right text-xs font-extrabold text-[#8a94a6]">
          글자 수: {count}
        </p>
      </div>
    </Panel>
  );
}

export function PhotoUploadPanel({
  files,
  onAddFile,
  onRemoveFile,
  onPreviewImage,
}: {
  files: UploadedFile[];
  onAddFile: () => void;
  onRemoveFile: (fileId: number) => void;
  onPreviewImage: (url: string, label: string) => void;
}) {
  return (
    <Panel>
      <div className="border-b border-[#edf1f6] px-5 py-3">
        <h2 className="text-base font-extrabold text-[#151b28]">사진 등록</h2>
      </div>
      <div className="space-y-3 px-5 py-4">
        <div className="flex gap-3">
          {files.map((file) => (
            <button
              type="button"
              key={file.id}
              onClick={() => onPreviewImage(file.url, file.label)}
              className="relative h-20 w-20 overflow-hidden rounded-lg bg-[#edf1f6]"
            >
              <img
                src={file.url}
                alt={file.label}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemoveFile(file.id);
                }}
                aria-label="첨부 삭제"
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#111827]/70 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          ))}
          <button
            type="button"
            onClick={onAddFile}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-[#cfd8e6] text-sm font-extrabold text-[#4d5874] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
          >
            <Plus className="h-6 w-6" />
            추가
          </button>
        </div>
        <button
          type="button"
          onClick={onAddFile}
          className="flex h-16 w-full items-center justify-center gap-3 rounded-lg border border-dashed border-[#cfd8e6] text-sm font-extrabold text-[#59657a] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
        >
          <FileUp className="h-5 w-5" />
          파일을 드래그하거나 클릭하여 업로드
          <span className="text-xs font-bold text-[#8a94a6]">
            JPG, PNG, DICOM, PDF, MP4 · 최대 50MB
          </span>
        </button>
      </div>
    </Panel>
  );
}

export function PrescriptionInputPanel({
  prescriptions,
  onRemove,
  onGenerate,
}: {
  prescriptions: Prescription[];
  onRemove: (name: string) => void;
  onGenerate: () => void;
}) {
  return (
    <Panel>
      <div className="border-b border-[#edf1f6] px-5 py-3">
        <h2 className="text-base font-extrabold text-[#151b28]">처방전</h2>
      </div>
      <div className="space-y-3 px-5 py-4">
        <div className="relative">
          <input
            placeholder="약제명 검색 (예: 아모시실린)"
            className="h-10 w-full rounded-lg border border-[#4a89ff] px-4 pr-10 text-sm font-bold outline-none ring-4 ring-[#edf5ff]"
          />
          <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4a89ff]" />
        </div>

        <div className="overflow-hidden rounded-lg border border-[#e8edf4]">
          <table className="w-full table-fixed text-left">
            <thead className="bg-[#f7f9fc] text-xs font-extrabold text-[#697386]">
              <tr>
                <th className="px-4 py-3">약제명</th>
                <th className="px-3 py-3">형태</th>
                <th className="px-3 py-3">용량</th>
                <th className="px-3 py-3">기간</th>
                <th className="w-[64px] px-3 py-3">삭제</th>
              </tr>
            </thead>
            <tbody>
              {prescriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-9 text-center text-sm font-bold text-[#8a94a6]"
                  >
                    검색을 통해 약을 추가해주세요.
                  </td>
                </tr>
              ) : (
                prescriptions.map((prescription) => (
                  <tr
                    key={prescription.drug_name}
                    className="border-t border-[#edf1f6] text-sm font-bold text-[#4d5874]"
                  >
                    <td className="px-4 py-3 font-extrabold text-[#20283a]">
                      {prescription.drug_name}
                    </td>
                    <td className="px-3 py-3">{prescription.form}</td>
                    <td className="px-3 py-3">{prescription.dosage}</td>
                    <td className="px-3 py-3">
                      {prescription.duration_days}일
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onRemove(prescription.drug_name)}
                        className="text-[#ef4444]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <button className="h-10 rounded-lg border border-[#dfe6f1] px-5 text-sm font-extrabold text-[#4d5874]">
            저장
          </button>
          <button
            type="button"
            onClick={onGenerate}
            className="h-10 rounded-lg bg-[#4a89ff] px-5 text-sm font-extrabold text-white transition hover:bg-[#2f7df6]"
          >
            처방전 자동 생성
          </button>
        </div>
      </div>
    </Panel>
  );
}
