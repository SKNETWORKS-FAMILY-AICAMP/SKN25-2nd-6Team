import type { ChangeEvent, RefObject } from "react";

import {
  genderOptions,
  maxNotesLength,
  neuteredOptions,
  type PetFormErrors,
  type PetFormState,
  speciesOptions,
} from "../../hooks/use-pet-form";

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const selectClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const errorInputClass = "border-red-400 focus:border-red-500 focus:ring-red-100";
const labelClass = "text-sm font-black text-slate-800";

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="mt-1 text-[10px] font-semibold text-red-500">{message}</p> : null;

const RequiredMark = () => <span className="ml-0.5 text-red-500">*</span>;

const PawIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M8.4 9.9c1.1 0 1.9-1.3 1.9-2.9S9.5 4.1 8.4 4.1 6.5 5.4 6.5 7s.8 2.9 1.9 2.9Zm7.2 0c1.1 0 1.9-1.3 1.9-2.9s-.8-2.9-1.9-2.9-1.9 1.3-1.9 2.9.8 2.9 1.9 2.9ZM5.4 13.2c.9-.3 1.2-1.8.7-3.2-.5-1.5-1.7-2.4-2.6-2.1-.9.3-1.2 1.8-.7 3.2.5 1.5 1.7 2.4 2.6 2.1Zm13.2 0c.9.3 2.1-.6 2.6-2.1.5-1.4.2-2.9-.7-3.2-.9-.3-2.1.6-2.6 2.1-.5 1.4-.2 2.9.7 3.2ZM12 11.3c-3.2 0-5.8 2.4-5.8 5.2 0 1.8 1.5 3.1 3.2 3.1 1 0 1.7-.4 2.6-.4s1.6.4 2.6.4c1.7 0 3.2-1.3 3.2-3.1 0-2.8-2.6-5.2-5.8-5.2Z" />
  </svg>
);

const choiceTone = {
  blue: "border-blue-300 bg-blue-50 text-blue-700",
  pink: "border-pink-300 bg-pink-50 text-pink-700",
  green: "border-emerald-300 bg-emerald-50 text-emerald-700",
  orange: "border-orange-300 bg-orange-50 text-orange-700",
  purple: "border-indigo-300 bg-indigo-50 text-indigo-700",
  slate: "border-slate-300 bg-slate-50 text-slate-700",
};

const getChoiceClass = (
  isSelected: boolean,
  tone: keyof typeof choiceTone = "slate",
) =>
  [
    "flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black transition",
    isSelected
      ? choiceTone[tone]
      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/60",
  ].join(" ");

interface PetFormProps {
  form: PetFormState;
  errors: PetFormErrors;
  isDetailMode: boolean;
  customSpeciesInputRef: RefObject<HTMLInputElement>;
  updateForm: <Key extends keyof PetFormState>(
    key: Key,
    value: PetFormState[Key],
  ) => void;
  handleNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleNotesChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
}

const PetForm = ({
  form,
  errors,
  isDetailMode,
  customSpeciesInputRef,
  updateForm,
  handleNameChange,
  handleNotesChange,
}: PetFormProps) => {
  return (
    <>
      <section className="p-6">
        <div className="mb-5 flex items-center gap-2 text-violet-700">
          <PawIcon className="h-5 w-5" />
          <h2 className="text-lg font-black">기본 정보</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="petname" className={labelClass}>
              이름
              <RequiredMark />
            </label>
            <input
              id="petname"
              value={form.petname}
              onChange={handleNameChange}
              readOnly={isDetailMode}
              placeholder="예시) 몽몽이"
              className={`${inputClass} mt-2 ${
                errors.petname ? errorInputClass : ""
              } ${isDetailMode ? "bg-slate-50" : ""}`}
            />
            <FieldError message={errors.petname} />
          </div>

          <div>
            <label htmlFor="gender" className={labelClass}>
              성별
              <RequiredMark />
            </label>
            <select
              id="gender"
              value={form.gender}
              disabled={isDetailMode}
              onChange={(event) => updateForm("gender", event.target.value)}
              className={`${selectClass} mt-2 ${
                errors.gender ? errorInputClass : ""
              } ${isDetailMode ? "bg-slate-50" : ""}`}
            >
              <option value="">선택해주세요</option>
              {genderOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError message={errors.gender} />
          </div>

          <div>
            <label htmlFor="weight" className={labelClass}>
              몸무게
              <RequiredMark />
            </label>
            <div className="relative mt-2">
              <input
                id="weight"
                type="number"
                min="0"
                step="0.1"
                value={form.weight}
                readOnly={isDetailMode}
                onChange={(event) => updateForm("weight", event.target.value)}
                placeholder="예) 4.2"
                className={`${inputClass} pr-12 ${
                  errors.weight ? errorInputClass : ""
                } ${isDetailMode ? "bg-slate-50" : ""}`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                kg
              </span>
            </div>
            <FieldError message={errors.weight} />
          </div>

          <div>
            <label htmlFor="is-neutered" className={labelClass}>
              중성화 여부
              <RequiredMark />
            </label>
            <select
              id="is-neutered"
              value={form.isNeutered}
              disabled={isDetailMode}
              onChange={(event) =>
                updateForm("isNeutered", event.target.value)
              }
              className={`${selectClass} mt-2 ${
                errors.isNeutered ? errorInputClass : ""
              } ${isDetailMode ? "bg-slate-50" : ""}`}
            >
              <option value="">선택해주세요</option>
              {neuteredOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldError message={errors.isNeutered} />
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 p-6">
        <div className="mb-5 flex items-center gap-2 text-violet-700">
          <PawIcon className="h-5 w-5" />
          <h2 className="text-lg font-black">종류</h2>
        </div>

        <div>
          <label className={labelClass}>
            종
            <RequiredMark />
          </label>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {speciesOptions.map((option) => (
              <button
                key={option}
                type="button"
                disabled={isDetailMode}
                onClick={() => {
                  updateForm("species", option);
                  if (option !== "기타") {
                    updateForm("customSpecies", "");
                  }
                }}
                className={getChoiceClass(
                  form.species === option,
                  option === "기타" ? "purple" : "slate",
                )}
              >
                <span>
                  {option === "강아지"
                    ? "🐶"
                    : option === "고양이"
                      ? "🐱"
                      : "+"}
                </span>
                {option}
              </button>
            ))}
          </div>
          <FieldError message={errors.species} />
        </div>

        <div className="mt-4">
          <input
            ref={customSpeciesInputRef}
            value={form.customSpecies}
            disabled={isDetailMode || form.species !== "기타"}
            onChange={(event) =>
              updateForm("customSpecies", event.target.value)
            }
            placeholder="직접 입력해주세요. 예: 카피바라"
            className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400 ${
              errors.customSpecies ? errorInputClass : ""
            }`}
          />
          <FieldError message={errors.customSpecies} />
        </div>

        <div className="mt-4">
          <label htmlFor="breed" className={labelClass}>
            품종 (선택)
          </label>
          <input
            id="breed"
            value={form.breed}
            readOnly={isDetailMode}
            onChange={(event) => updateForm("breed", event.target.value)}
            placeholder="예) 말티즈, 코리안숏헤어 등"
            className={`${inputClass} mt-2 ${isDetailMode ? "bg-slate-50" : ""}`}
          />
        </div>
      </section>

      <section className="border-t border-slate-100 p-6">
        <div className="mb-5 flex items-center gap-2 text-violet-700">
          <PawIcon className="h-5 w-5" />
          <h2 className="text-lg font-black">건강 정보</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="birth-date" className={labelClass}>
              생년월일
            </label>
            <input
              id="birth-date"
              type="date"
              value={form.birthDate}
              disabled={isDetailMode || form.isBirthUnknown}
              onChange={(event) => updateForm("birthDate", event.target.value)}
              className={`${inputClass} mt-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:placeholder:text-slate-400`}
            />
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={form.isBirthUnknown}
                disabled={isDetailMode}
                onChange={(event) => {
                  updateForm("isBirthUnknown", event.target.checked);
                  if (event.target.checked) {
                    updateForm("birthDate", "");
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              날짜를 모르겠어요
            </label>
          </div>

          <div>
            <label htmlFor="checkup-date" className={labelClass}>
              마지막 정기검진
            </label>
            <input
              id="checkup-date"
              type="date"
              value={form.checkupDate}
              disabled={isDetailMode || form.isCheckupUnknown}
              onChange={(event) =>
                updateForm("checkupDate", event.target.value)
              }
              className={`${inputClass} mt-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:placeholder:text-slate-400`}
            />
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={form.isCheckupUnknown}
                disabled={isDetailMode}
                onChange={(event) => {
                  updateForm("isCheckupUnknown", event.target.checked);
                  if (event.target.checked) {
                    updateForm("checkupDate", "");
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              검진 날짜를 모르겠어요
            </label>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label htmlFor="notes" className={labelClass}>
                특이사항 (선택)
              </label>
            </div>
            <div className="relative mt-2">
              <textarea
                id="notes"
                value={form.notes}
                readOnly={isDetailMode}
                onChange={handleNotesChange}
                placeholder="알레르기, 질병 이력, 성격 등 간단히 입력해주세요."
                className={`h-[88px] w-full resize-none rounded-xl border border-slate-200 px-4 py-3 pb-7 text-sm font-semibold leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 ${
                  isDetailMode ? "bg-slate-50" : "bg-white"
                }`}
              />
              <span className="absolute bottom-3 right-4 text-xs font-bold text-slate-400">
                {form.notes.length} / {maxNotesLength}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default PetForm;
