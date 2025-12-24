import React, { useMemo } from 'react';
import { TicketStatus, WeighTicket } from '../../types';
import { CheckCircleIcon, FileCheckIcon, HourglassIcon } from './icons';

const StatusBadge: React.FC<{ status: TicketStatus; isSigned: boolean; compact?: boolean }> =
  React.memo(({ status, isSigned, compact }) => {
    const styles = useMemo(() => {
      if (isSigned)
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          icon: <FileCheckIcon className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />,
          label: compact ? 'Đã ký' : 'ĐÃ KÝ SỐ',
        };
      switch (status) {
        case TicketStatus.COMPLETED:
          return {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200',
            icon: <CheckCircleIcon className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />,
            label: compact ? 'Xong' : 'HOÀN THÀNH',
          };
        case TicketStatus.PENDING_SECOND_WEIGH:
          return {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
            icon: <HourglassIcon className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />,
            label: compact ? 'Cân 2' : 'CHỜ CÂN 2',
          };
        case TicketStatus.SINGLE_WEIGH:
          return {
            bg: 'bg-slate-100',
            text: 'text-slate-700',
            border: 'border-slate-200',
            icon: <CheckCircleIcon className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />,
            label: compact ? '1 Lần' : 'CÂN 1 LẦN',
          };
        default:
          return {
            bg: 'bg-gray-100',
            text: 'text-gray-600',
            border: 'border-gray-200',
            icon: null,
            label: '---',
          };
      }
    }, [status, isSigned, compact]);

    return (
      <span
        className={`inline-flex items-center gap-1.5 py-0.5 px-2 rounded text-[10px] font-bold uppercase tracking-wider border ${styles.bg} ${styles.text} ${styles.border}`}
      >
        {styles.icon}
        {styles.label}
      </span>
    );
  });

export const TicketRow: React.FC<{
  t: WeighTicket;
  onClick: (t: WeighTicket) => void;
  isSelected: boolean;
}> = React.memo(({ t, onClick, isSelected }) => (
  <div
    onClick={() => onClick(t)}
    className={`p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-all ${isSelected ? 'bg-blue-50 border-l-4 border-l-brand-primary' : 'border-l-4 border-l-transparent'}`}
  >
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-slate-800 text-base">{t.vehicle.plateNumber}</span>
          <StatusBadge status={t.status} isSigned={t.isSigned} compact />
        </div>
        <span className="font-mono font-extrabold text-brand-primary text-base">
          {t.netWeight > 0 ? t.netWeight.toLocaleString('vi-VN') : '--'}{' '}
          <span className="text-[10px] text-gray-400 font-sans">KG</span>
        </span>
      </div>

      <div className="flex justify-between items-end">
        <div className="flex flex-col">
          <span className="text-xs text-industrial-muted font-medium">{t.ticketNo}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">{t.customer.name}</span>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5">
            📦 {t.product.name}
          </span>
        </div>
        <div className="text-[10px] text-industrial-muted font-medium">
          {new Date(t.weighInTime).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'numeric',
          })}
        </div>
      </div>
    </div>
  </div>
));

