import React from 'react';
import { WeighTicket, StationInfo } from '../../types';

interface PrintableTicketProps {
  ticket: WeighTicket;
  stationInfo: StationInfo;
}

export const PrintableTicket: React.FC<PrintableTicketProps> = ({ ticket, stationInfo }) => {
  const weighInDate = new Date(ticket.weighInTime);
  const weighOutDate = ticket.weighOutTime ? new Date(ticket.weighOutTime) : null;
  const displayOperatorName = ticket.operatorName || ticket.signedBy || '';

  return (
    <div
      id="printable-ticket-root"
      className="bg-white text-black box-border overflow-hidden"
      style={{
        // Ensure fallback to system fonts that support Vietnamese if web font fails in canvas capture
        // Arial/Times New Roman are safe bets for Vietnamese
        fontFamily: "'Inter', 'Arial', 'Times New Roman', sans-serif",
      }}
    >
      {/*
        A5 Landscape:
        Width: 794px (Standard web 96dpi)
        Height: 560px
        Layout: Flex Column để đẩy footer xuống đáy
      */}
      <div
        className="bg-white relative mx-auto text-slate-900 flex flex-col"
        style={{
          width: '794px',
          height: '560px', // Cố định chiều cao A5
          padding: '24px',
        }}
      >
        {/* Outer Border: Khung viền đôi phong cách phiếu in công nghiệp */}
        <div className="w-full h-full border-[3px] border-double border-slate-900 flex flex-col p-6 box-border rounded-sm bg-white relative">
          {/* --- 1. HEADER SECTION (SHRINK-0 để không bị co) --- */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-4 shrink-0">
            <div className="w-7/12 pr-2">
              <h1 className="text-2xl font-black uppercase tracking-wide leading-tight mb-2 text-slate-900">
                {stationInfo.name || 'TRẠM CÂN ĐIỆN TỬ'}
              </h1>
              <div className="text-xs font-semibold text-slate-800 space-y-1">
                <p>
                  <span className="font-bold text-slate-900">Đ/c:</span>{' '}
                  {stationInfo.address || '...'}
                </p>
                <p>
                  <span className="font-bold text-slate-900">Tel:</span> {stationInfo.phone}
                </p>
              </div>
            </div>

            <div className="w-5/12 text-right flex flex-col items-end justify-center">
              <h2 className="text-4xl font-black uppercase tracking-widest text-slate-900 leading-none mb-3">
                PHIẾU CÂN
              </h2>
              <div className="inline-flex items-center border-2 border-slate-900 px-4 py-3 bg-white">
                <span className="text-sm font-bold text-slate-900 uppercase mr-2">Số:</span>
                <span className="text-sm font-mono font-black text-red-600 tracking-tight leading-none">
                  {ticket.ticketNo}
                </span>
              </div>
            </div>
          </div>

          {/* --- 2. INFO GRID SECTION (SHRINK-0) --- */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm mb-5 shrink-0">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Dùng items-baseline để căn chân chữ thẳng hàng */}
              <div className="flex items-baseline border-b border-dotted border-slate-400 pb-2">
                <span className="w-24 text-xs font-bold text-slate-600 uppercase shrink-0">
                  Khách hàng:
                </span>
                {/* Bỏ truncate, cho phép xuống dòng nếu tên quá dài */}
                <span className="font-bold text-slate-900 uppercase text-sm leading-snug break-words flex-1">
                  {ticket.customer.name}
                </span>
              </div>
              <div className="flex items-baseline border-b border-dotted border-slate-400 pb-2">
                <span className="w-24 text-xs font-bold text-slate-600 uppercase shrink-0">
                  Hàng hoá:
                </span>
                <span className="font-bold text-slate-900 text-sm leading-snug break-words flex-1">
                  {ticket.product.name}
                </span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="flex items-baseline border-b border-dotted border-slate-400 pb-2">
                <span className="w-24 text-xs font-bold text-slate-600 uppercase shrink-0">
                  Biển số xe:
                </span>
                <span className="font-black text-2xl text-slate-900 leading-none flex-1">
                  {ticket.vehicle.plateNumber}
                </span>
              </div>
              <div className="flex items-baseline border-b border-dotted border-slate-400 pb-2">
                <span className="w-24 text-xs font-bold text-slate-600 uppercase shrink-0">
                  Tài xế:
                </span>
                <span className="font-bold text-slate-900 text-sm leading-snug flex-1">
                  {ticket.driverName}
                </span>
              </div>
            </div>
          </div>

          {/* --- 3. DATA TABLE (SHRINK-0) --- */}
          <div className="w-full mb-2 shrink-0">
            <table className="w-full border-collapse border border-slate-900">
              <thead className="bg-slate-100 text-slate-900">
                <tr>
                  <th className="border border-slate-900 py-2.5 px-2 text-center text-xs font-black uppercase w-[25%]">
                    Diễn giải
                  </th>
                  <th className="border border-slate-900 py-2.5 px-2 text-center text-xs font-black uppercase w-[40%]">
                    Ngày giờ cân
                  </th>
                  <th className="border border-slate-900 py-2.5 px-2 text-center text-xs font-black uppercase w-[35%]">
                    Khối lượng (KG)
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Gross */}
                <tr>
                  <td className="border border-slate-900 py-2.5 px-3 text-sm font-bold text-slate-800">
                    Tổng tải (Gross)
                  </td>
                  <td className="border border-slate-900 py-2.5 px-3 text-center font-mono text-sm text-slate-900 font-bold">
                    {weighInDate.toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    &nbsp; {weighInDate.toLocaleDateString('vi-VN')}
                  </td>
                  <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-xl text-slate-900">
                    {ticket.grossWeight.toLocaleString('vi-VN')}
                  </td>
                </tr>
                {/* Tare */}
                <tr>
                  <td className="border border-slate-900 py-2.5 px-3 text-sm font-bold text-slate-800">
                    Tự trọng (Tare)
                  </td>
                  <td className="border border-slate-900 py-2.5 px-3 text-center font-mono text-sm text-slate-900 font-bold">
                    {weighOutDate
                      ? `${weighOutDate.toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}  ${weighOutDate.toLocaleDateString('vi-VN')}`
                      : ''}
                  </td>
                  <td className="border border-slate-900 py-2.5 px-3 text-right font-mono font-black text-xl text-slate-900">
                    {ticket.tareWeight > 0 ? ticket.tareWeight.toLocaleString('vi-VN') : '-'}
                  </td>
                </tr>
                {/* Net */}
                <tr className="bg-slate-50">
                  <td className="border border-slate-900 py-3 px-3 text-base font-black uppercase text-slate-900">
                    Hàng thực (Net)
                  </td>
                  <td className="border border-slate-900 py-3 px-3 align-middle">
                    {ticket.notes && (
                      <span className="text-xs italic text-slate-700 block text-center font-semibold break-words">
                        {ticket.notes}
                      </span>
                    )}
                  </td>
                  <td className="border border-slate-900 py-3 px-3 text-right font-mono font-black text-3xl text-slate-900 leading-none">
                    {ticket.netWeight > 0 ? ticket.netWeight.toLocaleString('vi-VN') : '0'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* --- 4. FOOTER / SIGNATURES (MT-AUTO để đẩy xuống đáy, nhưng dùng fixed gap cho tên) --- */}
          <div className="w-full mt-auto pt-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Driver Signature */}
              <div className="flex flex-col items-center">
                <div className="text-center mb-1">
                  <p className="text-xs font-bold uppercase text-slate-900">Tài xế / Khách hàng</p>
                  <p className="text-[10px] italic text-slate-500">(Ký, ghi rõ họ tên)</p>
                </div>
                {/* Spacer cố định 14 (3.5rem) thay vì flex-grow */}
                <div className="h-14 w-full"></div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 px-1 uppercase break-words">
                    {ticket.driverName}
                  </p>
                </div>
              </div>

              {/* Warehouse Signature */}
              <div className="flex flex-col items-center">
                <div className="text-center mb-1">
                  <p className="text-xs font-bold uppercase text-slate-900">Thủ kho</p>
                  <p className="text-[10px] italic text-slate-500">(Ký, ghi rõ họ tên)</p>
                </div>
                <div className="h-14 w-full"></div>
              </div>

              {/* Operator Signature */}
              <div className="flex flex-col items-center">
                <div className="text-center mb-1">
                  <p className="text-xs font-bold uppercase text-slate-900">Nhân viên cân</p>
                  <p className="text-[10px] italic text-slate-500">(Ký, đóng dấu)</p>
                </div>

                <div className="h-14 w-full flex items-center justify-center relative">
                  {ticket.signatureImage && (
                    <img
                      src={ticket.signatureImage}
                      className="max-h-full w-auto object-contain mix-blend-multiply"
                      alt="Signature"
                    />
                  )}
                </div>

                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900 px-1 uppercase break-words">
                    {displayOperatorName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamp Footer */}
          <div className="text-center mt-2 pt-2 border-t border-slate-300 shrink-0">
            <p className="text-[10px] text-slate-500 italic font-medium">
              Ngày in: {new Date().toLocaleDateString('vi-VN')}{' '}
              {new Date().toLocaleTimeString('vi-VN')} | PrintID: {Date.now().toString().slice(-6)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
