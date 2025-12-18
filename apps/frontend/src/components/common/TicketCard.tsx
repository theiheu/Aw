import React from 'react';
import { WeighTicket, TicketStatus } from '../../types';
import {
  TruckIcon,
  CheckCircleIcon,
  HourglassIcon,
  FileCheckIcon,
  UserIcon,
  PackageIcon,
} from './icons';

interface TicketCardProps {
  ticket: WeighTicket;
  onClick: () => void;
  isActive?: boolean;
}

const getStatusStyles = (status: TicketStatus, isSigned: boolean) => {
  if (isSigned) {
    return {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-l-4 border-green-500',
      icon: <FileCheckIcon className="w-5 h-5 text-green-600" />,
      label: 'Đã ký số',
    };
  }
  switch (status) {
    case TicketStatus.COMPLETED:
      return {
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-800',
        borderColor: 'border-l-4 border-blue-500',
        icon: <CheckCircleIcon className="w-5 h-5 text-blue-600" />,
        label: 'Hoàn thành',
      };
    case TicketStatus.PENDING_SECOND_WEIGH:
      return {
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-l-4 border-yellow-500',
        icon: <HourglassIcon className="w-5 h-5 text-yellow-600" />,
        label: 'Chờ cân lần 2',
      };
    case TicketStatus.SINGLE_WEIGH:
      return {
        bgColor: 'bg-indigo-100',
        textColor: 'text-indigo-800',
        borderColor: 'border-l-4 border-indigo-500',
        icon: <CheckCircleIcon className="w-5 h-5 text-indigo-600" />,
        label: 'Cân 1 lần',
      };
    default:
      return {
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-l-4 border-gray-500',
        icon: null,
        label: 'Không xác định',
      };
  }
};

export const TicketCard: React.FC<TicketCardProps> = React.memo(({ ticket, onClick, isActive }) => {
  const { bgColor, textColor, borderColor, icon, label } = getStatusStyles(
    ticket.status,
    ticket.isSigned
  );

  return (
    <div
      className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all duration-200 mb-2 ${
        isActive ? 'ring-2 ring-offset-2 ring-brand-primary' : 'hover:scale-[1.02]'
      } ${borderColor}`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <TruckIcon className="w-8 h-8 text-slate-500 mr-3" />
            <div>
              <p className="font-bold text-lg text-slate-800">{ticket.vehicle.plateNumber}</p>
              <p className="text-sm text-slate-600">{ticket.ticketNo}</p>
            </div>
          </div>
          <div
            className={`flex items-center px-2.5 py-1.5 rounded-full text-xs font-semibold ${bgColor} ${textColor}`}
          >
            {icon}
            <span className="ml-1.5">{label}</span>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <div className="flex items-center text-sm text-slate-600 mb-2">
            <UserIcon className="w-4 h-4 mr-2 text-slate-500" />
            <span>
              Khách hàng: <span className="font-medium text-slate-800">{ticket.customer.name}</span>
            </span>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <PackageIcon className="w-4 h-4 mr-2 text-slate-500" />
            <span>
              Hàng hoá: <span className="font-medium text-slate-800">{ticket.product.name}</span>
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-end">
          <div>
            <p className="text-xs text-slate-500">Khối lượng hàng</p>
            <p className="text-2xl font-bold text-brand-primary">
              {ticket.netWeight > 0 ? `${ticket.netWeight.toLocaleString('vi-VN')} KG` : '---'}
            </p>
          </div>
          <p className="text-xs text-slate-500">
            {new Date(ticket.weighInTime).toLocaleString('vi-VN')}
          </p>
        </div>
      </div>
    </div>
  );
});
