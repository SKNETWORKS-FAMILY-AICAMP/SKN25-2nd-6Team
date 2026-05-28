import { Printer, X } from "lucide-react";
import type { PrescriptionDocumentResponse } from "../../types/emr";

export function PrescriptionPreviewModal({
  document,
  onClose,
}: {
  document: PrescriptionDocumentResponse;
  onClose: () => void;
}) {
  const data = document.result;
  const issuedDateParts = data.issued_at.match(/(\d{4})년\s*(\d{2})월\s*(\d{2})일/);
  const issuedYear = issuedDateParts?.[1] ?? "";
  const issuedMonth = issuedDateParts?.[2] ?? "";
  const issuedDay = issuedDateParts?.[3] ?? "";
  const medicineRows = Math.max(0, 6 - data.prescriptions.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/55 px-4 py-6 print-prescription-modal">
      <div className="max-h-[92vh] w-full max-w-[900px] overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#edf1f6] px-5 py-4 print:hidden">
          <div>
            <h2 className="text-lg font-extrabold text-[#151b28]">
              처방전 미리보기
            </h2>
            <p className="mt-1 text-xs font-bold text-[#6b7486]">
              아래는 실제 출력되는 수의사 처방전 양식입니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-9 items-center gap-2 rounded-lg border border-[#dfe6f1] px-3 text-sm font-extrabold text-[#4d5874] transition hover:border-[#4a89ff] hover:text-[#2f7df6]"
            >
              <Printer className="h-4 w-4" />
              출력
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#4d5874] transition hover:bg-[#f3f6fb]"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-78px)] overflow-auto bg-[#f5f7fb] p-6">
          <div className="prescription-print-page prescription-form mx-auto bg-white text-[#111827] shadow-sm">
            <p className="form-rule-title">■ 수의사법 시행규칙 [별지 제10호서식]</p>
            <h1 className="form-title">
                처 방 전
            </h1>

            <table className="form-table issue-table">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[46%]" />
                <col className="w-[14%]" />
                <col className="w-[22%]" />
              </colgroup>
              <tbody>
                <tr>
                  <th className="shade">발급 연월일</th>
                  <td className="date-cell">
                    {issuedYear} 년&nbsp;&nbsp;&nbsp;&nbsp; {issuedMonth} 월&nbsp;&nbsp;&nbsp;&nbsp; {issuedDay} 일
                  </td>
                  <th className="shade">발급 번호</th>
                  <td>{data.issue_number}</td>
                </tr>
                <tr>
                  <th>처방전 유효기간</th>
                  <td className="date-cell">
                    발급일부터 (&nbsp;&nbsp;&nbsp;&nbsp; {data.valid_days} &nbsp;&nbsp;&nbsp;&nbsp;)일간
                  </td>
                  <td colSpan={2} className="notice-cell">
                    처방전 유효기간 내에 구매해야 합니다.
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="form-table subject-table">
              <colgroup>
                <col className="w-[8%]" />
                <col className="w-[18%]" />
                <col className="w-[28%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[20%]" />
              </colgroup>
              <tbody>
                <tr>
                  <th rowSpan={3} className="side-head">
                    개별 처방
                    <br />
                    [ ]
                  </th>
                  <th>동물의 이름</th>
                  <td>{data.pet.name}</td>
                  <th rowSpan={3} className="side-head">
                    동물의
                    <br />
                    소유자[ ]
                    <br />
                    관리인[ ]
                  </th>
                  <th>성명</th>
                  <td>{data.pet.owner_name}</td>
                </tr>
                <tr>
                  <th>동물의 종류</th>
                  <td>{data.pet.species}</td>
                  <th>전화번호</th>
                  <td>010-1234-5678</td>
                </tr>
                <tr>
                  <th>성별/연령/체중 등</th>
                  <td>{data.pet.gender}</td>
                  <th>생년월일</th>
                  <td>{data.pet.birth_date}</td>
                </tr>
                <tr>
                  <th rowSpan={3} className="side-head">
                    군별
                    <br />
                    처방
                    <br />
                    [ ]
                  </th>
                  <th>축사번호</th>
                  <td>-</td>
                  <th rowSpan={3} className="side-head shade">
                    동물병원[ ]
                    <br />
                    축산농장[ ]
                  </th>
                  <th className="shade">명칭</th>
                  <td className="shade">{data.hospital.name}</td>
                </tr>
                <tr>
                  <th>동물의 종류</th>
                  <td>{data.pet.species}</td>
                  <th className="shade">전화번호</th>
                  <td className="shade">{data.hospital.phone}</td>
                </tr>
                <tr>
                  <th>마릿수</th>
                  <td>총&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;마리</td>
                  <th className="shade">사업자 등록번호</th>
                  <td className="shade">
                    {data.hospital.business_number}
                  </td>
                </tr>
                <tr>
                  <th colSpan={2} className="shade">
                    처방 수의사
                  </th>
                  <td>성명&nbsp;&nbsp; {data.doctor.name}</td>
                  <td>(서명 또는 날인)</td>
                  <th>수의사 면허번호</th>
                  <td>제 {data.doctor.license_number} 호</td>
                </tr>
              </tbody>
            </table>

            <table className="form-table medicine-table">
              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[31%]" />
                <col className="w-[17%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[7%]" />
              </colgroup>
              <tbody>
                <tr>
                  <th rowSpan={medicineRows + data.prescriptions.length + 1} className="side-head">
                    필/선
                  </th>
                  <th>성분명</th>
                  <th>권장 제품명</th>
                  <th>용량<br />(1회 투약량)</th>
                  <th>용법</th>
                  <th>처방일수<br />(투약일수)</th>
                  <th>판매 수량<br />(포장 단위)</th>
                  <th>비고</th>
                </tr>
                {data.prescriptions.map((prescription) => (
                  <tr key={prescription.ingredient}>
                    <td className="ingredient-cell">
                      {prescription.ingredient}
                    </td>
                    <td>{prescription.product_name}</td>
                    <td>{prescription.dosage}</td>
                    <td>{prescription.frequency}</td>
                    <td>{prescription.duration_days}일</td>
                    <td>{prescription.quantity}</td>
                    <td>-</td>
                  </tr>
                ))}
                {Array.from({ length: medicineRows }).map((_, index) => (
                  <tr key={`empty-${index}`}>
                    {Array.from({ length: 7 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="blank-medicine-cell" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="form-table sale-summary-table">
              <colgroup>
                <col className="w-[17%]" />
                <col className="w-[9%]" />
                <col className="w-[34%]" />
                <col className="w-[14%]" />
                <col className="w-[26%]" />
              </colgroup>
              <tbody>
                <tr>
                  <th colSpan={5} className="section-title">
                    의약품 판매 내용
                  </th>
                </tr>
                <tr>
                  <th>판매기관</th>
                  <th>명칭</th>
                  <td />
                  <th>대표자 성명</th>
                  <td />
                </tr>
                <tr>
                  <th>판매 약사</th>
                  <th>성명</th>
                  <td>(서명 또는 날인)</td>
                  <th>면허번호</th>
                  <td />
                </tr>
                <tr>
                  <th>판매 연월일</th>
                  <td colSpan={2} />
                  <th>비고</th>
                  <td />
                </tr>
              </tbody>
            </table>

            <table className="form-table sale-detail-table">
              <colgroup>
                <col className="w-[5%]" />
                <col className="w-[33%]" />
                <col className="w-[17%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
              </colgroup>
              <tbody>
                <tr>
                  <th rowSpan={5} className="side-head">필/선</th>
                  <th>판매 제품명(제조사)</th>
                  <th>규격(포장 단위)</th>
                  <th>판매량</th>
                  <th>유통기한</th>
                  <th>휴약기간</th>
                  <th>비고</th>
                </tr>
                {Array.from({ length: 3 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 6 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="blank-sale-cell" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="paper-note">
              210mm×297mm(일반용지 60g/㎡(재활용품))
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
