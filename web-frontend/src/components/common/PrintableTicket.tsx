import React from 'react';
import { WeighTicket, StationInfo } from '../../types';

interface PrintableTicketProps {
  ticket: WeighTicket;
  stationInfo: StationInfo;
}

// Helper formatters
const fmtDateTime = (d?: Date | null) =>
  d
    ? `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`
    : '';

const fmtWeight = (n: number | undefined) =>
  typeof n === 'number' && !Number.isNaN(n) ? n.toLocaleString('vi-VN') : '-';

export const PrintableTicket: React.FC<PrintableTicketProps> = ({ ticket, stationInfo }) => {
  const weighInDate = new Date(ticket.weighInTime);
  const weighOutDate = ticket.weighOutTime ? new Date(ticket.weighOutTime) : null;
  const displayOperatorName = ticket.operatorName || ticket.signedBy || '';

  const ticketNo = ticket.ticketNo || ticket.id || '';
  const directionLabel = ticket.weighOutTime ? 'XUẤT HÀNG' : 'NHẬP HÀNG';

  return (
    <div
      id="printable-ticket-root"
      className="bg-white text-black box-border overflow-hidden"
      style={{
        fontFamily: "'Times New Roman', 'Arial', sans-serif",
      }}
    >
      {/* A5 Landscape exact size in px for 96dpi capture */}
      <div
        className="bg-white relative mx-auto text-slate-900 flex flex-col"
        style={{ width: '794px', height: '560px', padding: '24px' }}
      >
        {/* Outer Border */}
        <div className="w-full h-full border border-slate-700 flex flex-col p-6 box-border rounded bg-white relative">
          {/* Header line with company info and STT */}
          <div className="flex items-start justify-between mb-1">
            <div className="text-[13px] leading-snug">
              <div className="font-bold uppercase">{stationInfo.name || 'CÔNG TY/ĐƠN VỊ'}</div>
              <div>
                {stationInfo.address || 'Địa chỉ ...'}
              </div>
            </div>
            <div className="text-right text-[13px] leading-snug">
              <div>
                <span className="uppercase font-bold">STT</span>
                <span className="mx-1">:</span>
                <span className="font-bold">{String(ticketNo).slice(-6)}</span>
              </div>
            </div>
          </div>

          {/* Title centered */}
          <div className="text-center my-2">
            <div className="text-3xl font-extrabold uppercase tracking-wide">PHIẾU CÂN XE</div>
          </div>

          {/* Two column info like sample */}
          <div className="grid grid-cols-2 gap-10 mt-1 text-[15px]">
            <div className="space-y-2">
              <Row label="Hàng hóa" value={ticket.product?.name} strong uppercase />
              <Row label="Khách hàng" value={ticket.customer?.name} strong uppercase />
              <Row label="Số xe" value={ticket.vehicle?.plateNumber} strong uppercase large />
              <Row label="TL Xe và hàng" value={`${fmtWeight(ticket.grossWeight)} kg`} boldValue />
              <Row label="TL Xe" value={`${fmtWeight(ticket.tareWeight)} kg`} boldValue />
              <Row label="TL Hàng" value={`${fmtWeight(ticket.netWeight)} kg`} boldValue highlight />
              <Row label="Ghi chú" value={ticket.notes || ''} />
              <Row label="Ngày in phiếu" value={fmtDateTime(new Date())} />
            </div>

            <div className="space-y-2">
              <Row label="Số chứng từ" value={ticket.code || ticketNo} />
              <Row label="Ngày giờ cân" value={fmtDateTime(weighInDate)} />
              <Row label="Ngày giờ cân" value={fmtDateTime(weighOutDate)} />
              <Row label="Kiểu cân" value={directionLabel} uppercase />
            </div>
          </div>

          {/* Signatures area (four columns) */}
          <div className="grid grid-cols-4 gap-6 mt-6 pt-4">
            <SignatureCol title="Bảo vệ" />
            <SignatureCol title="Tài xế" bottomText={ticket.driverName} />
            <SignatureCol title="Thủ kho" />
            <SignatureCol title="Nhân viên cân" bottomText={displayOperatorName} signatureImage={ticket.signatureImage} />
          </div>

          {/* Footer note */}
          <div className="text-center text-[11px] text-slate-600 italic mt-auto pt-5">
            {stationInfo.footerNote || 'Phần mềm cân điện tử - Bản quyền thuộc về đơn vị triển khai.'}
          </div>
        </div>
      </div>
    </div>
  );
};

interface RowProps {
  label: string;
  value?: string | number | null;
  boldValue?: boolean;
  strong?: boolean;
  uppercase?: boolean;
  large?: boolean;
  highlight?: boolean;
}

const Row: React.FC<RowProps> = ({ label, value, boldValue, strong, uppercase, large, highlight }) => {
  const val = value == null ? '' : String(value);
  return (
    <div className="flex items-baseline">
      <div className="w-40 text-[13px] text-slate-700 font-semibold">{label}</div>
      <div className="mx-1">:</div>
      <div
        className={[
          'flex-1',
          'leading-snug',
          strong ? 'font-bold' : '',
          uppercase ? 'uppercase' : '',
          large ? 'text-xl' : 'text-[15px]',
          boldValue ? 'font-black' : '',
          highlight ? 'underline decoration-2' : '',
        ].join(' ')}
        style={{ wordBreak: 'break-word' }}
      >
        {val}
      </div>
    </div>
  );
};

interface SignatureColProps {
  title: string;
  bottomText?: string;
  signatureImage?: string;
}

const SignatureCol: React.FC<SignatureColProps> = ({ title, bottomText, signatureImage }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-1">
        <p className="text-xs font-bold uppercase text-slate-900">{title}</p>
        <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
      </div>
      <div className="h-16 w-full flex items-center justify-center">
        {signatureImage && (
          <img
            src={signatureImage}
            className="max-h-full w-auto object-contain mix-blend-multiply"
            alt="Signature"
          />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-900 px-1 uppercase break-words">{bottomText || ''}</p>
      </div>
    </div>
  );
};
