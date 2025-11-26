import React, { useState, useMemo, useCallback } from 'react';
import { WeighTicket, TicketStatus, TicketSubmissionStatus, Customer, Product, Vehicle, User, StationInfo } from '../../types';
import {
  CheckCircleIcon,
  FilterIcon,
  HourglassIcon,
  ListIcon,
  PrinterIcon,
  TruckIcon,
  UserIcon,
  PackageIcon,
  EditIcon,
  SaveIcon,
  XIcon,
} from '../common/icons';

interface TicketSubmissionScreenProps {
  tickets: WeighTicket[];
  currentUser: User;
  stationInfo: StationInfo;
  vehicles: Vehicle[];
  customers: Customer[];
  products: Product[];
  onAddTicket: (ticket: WeighTicket) => void;
  onUpdateTicket: (ticket: WeighTicket) => void;
  onSubmitTicket: (ticketId: string) => void;
  onPrintRequest: (ticket: WeighTicket) => void;
}

// Status Badge Component
const SubmissionStatusBadge: React.FC<{ status?: TicketSubmissionStatus }> = React.memo(
  ({ status }) => {
    const styles = useMemo(() => {
      switch (status) {
        case TicketSubmissionStatus.DRAFT:
          return {
            bg: 'bg-slate-100',
            text: 'text-slate-700',
            border: 'border-slate-200',
            label: 'Nháp',
          };
        case TicketSubmissionStatus.SUBMITTED:
          return {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200',
            label: 'Đã gửi',
          };
        case TicketSubmissionStatus.APPROVED:
          return {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            label: 'Đã duyệt',
          };
        case TicketSubmissionStatus.REJECTED:
          return {
            bg: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-200',
            label: 'Bị từ chối',
          };
        default:
          return {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            border: 'border-gray-200',
            label: '---',
          };
      }
    }, [status]);

    return (
      <span
        className={`inline-flex items-center py-1 px-2.5 rounded text-[10px] font-bold uppercase tracking-wide border ${styles.bg} ${styles.text} ${styles.border}`}
      >
        {styles.label}
      </span>
    );
  }
);

// Input Field Component
const InputField: React.FC<{
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder: string;
  options?: string[];
  dataListId?: string;
  disabled?: boolean;
  icon: React.ReactNode;
  type?: string;
}> = React.memo(
  ({
    label,
    value,
    onChange,
    placeholder,
    options,
    dataListId,
    disabled,
    icon,
    type = 'text',
  }) => (
    <div>
      <label className="block text-[10px] font-bold text-industrial-muted uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative group">
        <div
          className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-brand-primary'}`}
        >
          {icon}
        </div>
        <input
          type={type}
          list={dataListId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-industrial-border rounded-md text-industrial-text text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
        />
        {options && dataListId && (
          <datalist id={dataListId}>
            {options.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        )}
      </div>
    </div>
  )
);

// Ticket Card Component
const TicketCard: React.FC<{
  ticket: WeighTicket;
  onEdit: (ticket: WeighTicket) => void;
  onSubmit: (ticketId: string) => void;
  onDelete: (ticketId: string) => void;
  onPrint: (ticket: WeighTicket) => void;
  isSelected: boolean;
}> = React.memo(({ ticket, onEdit, onSubmit, onDelete, onPrint, isSelected }) => {
  const isDraft = ticket.submissionStatus === TicketSubmissionStatus.DRAFT;
  const isSubmitted = ticket.submissionStatus === TicketSubmissionStatus.SUBMITTED;
  const isApproved = ticket.submissionStatus === TicketSubmissionStatus.APPROVED;

  return (
    <div
      className={`p-4 border rounded-lg transition-all ${
        isSelected
          ? 'border-brand-primary bg-blue-50 shadow-md'
          : 'border-industrial-border bg-white hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-extrabold text-lg text-industrial-text">
              {ticket.vehicle.plateNumber}
            </span>
            <SubmissionStatusBadge status={ticket.submissionStatus} />
          </div>
          <div className="text-xs text-industrial-muted space-y-1">
            <div>
              <span className="font-bold">Phiếu:</span> {ticket.ticketNo}
            </div>
            <div>
              <span className="font-bold">Khách hàng:</span> {ticket.customer.name}
            </div>
            <div>
              <span className="font-bold">Hàng hóa:</span> {ticket.product.name}
            </div>
            <div>
              <span className="font-bold">Tài xế:</span> {ticket.driverName}
            </div>
            {ticket.rejectionReason && (
              <div className="text-red-600 font-semibold">
                <span className="font-bold">Lý do từ chối:</span> {ticket.rejectionReason}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-brand-primary">
            {ticket.netWeight > 0 ? ticket.netWeight.toLocaleString('vi-VN') : '--'}
            <span className="text-xs text-gray-400 font-sans ml-1">KG</span>
          </div>
          <div className="text-[10px] text-industrial-muted mt-2">
            {new Date(ticket.weighInTime).toLocaleString('vi-VN')}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 flex gap-2 flex-wrap">
        {isDraft && (
          <>
            <button
              onClick={() => onEdit(ticket)}
              className="flex-1 min-w-[100px] px-3 py-2 bg-brand-accent text-white rounded text-xs font-bold uppercase hover:bg-amber-600 transition-colors flex items-center justify-center gap-1"
            >
              <EditIcon className="w-3 h-3" /> Sửa
            </button>
            <button
              onClick={() => onSubmit(ticket.id)}
              className="flex-1 min-w-[100px] px-3 py-2 bg-brand-primary text-white rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
            >
              <CheckCircleIcon className="w-3 h-3" /> Gửi
            </button>
            <button
              onClick={() => onDelete(ticket.id)}
              className="flex-1 min-w-[100px] px-3 py-2 bg-red-50 text-red-700 rounded text-xs font-bold uppercase hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
            >
              <XIcon className="w-3 h-3" /> Xóa
            </button>
          </>
        )}
        {isSubmitted && (
          <div className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded text-xs font-bold uppercase text-center">
            ⏳ Chờ admin xác nhận
          </div>
        )}
        {isApproved && (
          <>
            <button
              onClick={() => onPrint(ticket)}
              className="flex-1 min-w-[100px] px-3 py-2 bg-industrial-text text-white rounded text-xs font-bold uppercase hover:bg-black transition-colors flex items-center justify-center gap-1"
            >
              <PrinterIcon className="w-3 h-3" /> In
            </button>
            <div className="flex-1 min-w-[100px] px-3 py-2 bg-emerald-50 text-emerald-700 rounded text-xs font-bold uppercase text-center">
              ✓ Đã duyệt
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export const TicketSubmissionScreen: React.FC<TicketSubmissionScreenProps> = ({
  tickets,
  currentUser,
  stationInfo,
  vehicles,
  customers,
  products,
  onAddTicket,
  onUpdateTicket,
  onSubmitTicket,
  onPrintRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [selectedTicket, setSelectedTicket] = useState<WeighTicket | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [plateNumber, setPlateNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [operatorName, setOperatorName] = useState(
    stationInfo.defaultOperatorName || currentUser.name
  );
  const [grossWeight, setGrossWeight] = useState<number>(0);
  const [tareWeight, setTareWeight] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketSubmissionStatus | ''>('');

  // Get user's tickets only
  const userTickets = useMemo(() => {
    return tickets.filter((t) => t.createdBy === currentUser.name || !t.createdBy);
  }, [tickets, currentUser.name]);

  // Filter tickets based on search and status
  const filteredTickets = useMemo(() => {
    return userTickets.filter((ticket) => {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const searchMatch =
        !searchTerm ||
        ticket.ticketNo.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.vehicle.plateNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.customer.name.toLowerCase().includes(lowerCaseSearchTerm);

      const statusMatch = !statusFilter || ticket.submissionStatus === statusFilter;

      return searchMatch && statusMatch;
    });
  }, [userTickets, searchTerm, statusFilter]);

  const resetForm = useCallback(() => {
    setPlateNumber('');
    setCustomerName('');
    setProductName('');
    setDriverName('');
    setOperatorName(stationInfo.defaultOperatorName || currentUser.name);
    setGrossWeight(0);
    setTareWeight(0);
    setNotes('');
    setSelectedTicket(null);
    setIsEditing(false);
  }, [stationInfo.defaultOperatorName, currentUser.name]);

  const handleEditTicket = useCallback((ticket: WeighTicket) => {
    setSelectedTicket(ticket);
    setPlateNumber(ticket.vehicle.plateNumber);
    setCustomerName(ticket.customer.name);
    setProductName(ticket.product.name);
    setDriverName(ticket.driverName);
    setOperatorName(ticket.operatorName || '');
    setGrossWeight(ticket.grossWeight);
    setTareWeight(ticket.tareWeight);
    setNotes(ticket.notes || '');
    setIsEditing(true);
    setActiveTab('create');
  }, []);

  const handleSaveTicket = useCallback(() => {
    if (!plateNumber || !customerName || !productName || !driverName) {
      alert('Vui lòng nhập đủ thông tin phiếu cân');
      return;
    }

    if (selectedTicket && isEditing) {
      // Update existing ticket
      const updatedTicket: WeighTicket = {
        ...selectedTicket,
        vehicle: { ...selectedTicket.vehicle, plateNumber },
        customer: { ...selectedTicket.customer, name: customerName },
        product: { ...selectedTicket.product, name: productName },
        driverName,
        operatorName,
        grossWeight,
        tareWeight,
        netWeight: Math.abs(grossWeight - tareWeight),
        notes,
        submissionStatus: TicketSubmissionStatus.DRAFT,
      };
      onUpdateTicket(updatedTicket);
      alert('Đã cập nhật phiếu cân');
    } else {
      // Create new ticket
      const newTicket: WeighTicket = {
        id: new Date().toISOString(),
        ticketNo: `TK${Date.now().toString().slice(-8)}`,
        vehicle: { id: `v_${Date.now()}`, plateNumber },
        customer: { id: `c_${Date.now()}`, name: customerName },
        product: { id: `p_${Date.now()}`, name: productName },
        driverName,
        operatorName,
        grossWeight,
        tareWeight,
        netWeight: Math.abs(grossWeight - tareWeight),
        weighInTime: new Date(),
        status: TicketStatus.PENDING_APPROVAL,
        submissionStatus: TicketSubmissionStatus.DRAFT,
        isSigned: false,
        notes,
        createdBy: currentUser.name,
        createdByName: currentUser.name,
      };
      onAddTicket(newTicket);
      alert('Đã tạo phiếu cân mới');
    }

    resetForm();
  }, [
    plateNumber,
    customerName,
    productName,
    driverName,
    operatorName,
    grossWeight,
    tareWeight,
    notes,
    selectedTicket,
    isEditing,
    currentUser.name,
    onAddTicket,
    onUpdateTicket,
    resetForm,
  ]);

  const handleDeleteTicket = useCallback(
    (ticketId: string) => {
      if (window.confirm('Bạn chắc chắn muốn xóa phiếu cân này?')) {
        // In a real app, this would call an API
        alert('Phiếu cân đã được xóa');
      }
    },
    []
  );

  const handleSubmitTicket = useCallback(
    (ticketId: string) => {
      if (window.confirm('Gửi phiếu cân này để admin xác nhận?')) {
        onSubmitTicket(ticketId);
        alert('Phiếu cân đã được gửi cho admin xác nhận');
      }
    },
    [onSubmitTicket]
  );

  return (
    <div className="bg-industrial-bg min-h-screen h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-industrial-border flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-text uppercase tracking-tight">
            Phiếu Cân Của Tôi
          </h1>
          <p className="text-xs text-industrial-muted">Tạo và quản lý phiếu cân cá nhân</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-industrial-text">{currentUser.name}</p>
          <p className="text-xs text-industrial-muted">{currentUser.role}</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-industrial-border bg-white shrink-0 shadow-sm z-10">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-center font-bold text-xs uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-industrial-muted hover:text-industrial-text'
            }`}
          >
            Tạo Phiếu Mới
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-center font-bold text-xs uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-industrial-muted hover:text-industrial-text'
            }`}
          >
            Lịch Sử Phiếu ({userTickets.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto p-6 custom-scrollbar pb-24">
        {activeTab === 'create' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-industrial border border-industrial-border p-6 space-y-6">
              {isEditing && (
                <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg flex items-center text-amber-800 text-sm">
                  <EditIcon className="w-4 h-4 mr-2" />
                  <span className="font-bold uppercase">Đang chỉnh sửa phiếu cân</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Transport Section */}
                <div className="md:col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-4 text-brand-primary">
                    <TruckIcon className="w-5 h-5" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">
                      Thông tin vận tải
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField
                      label="Biển số xe"
                      value={plateNumber}
                      onChange={setPlateNumber}
                      options={vehicles.map((v) => v.plateNumber)}
                      dataListId="vehicle-options"
                      placeholder="59C-12345"
                      disabled={false}
                      icon={<TruckIcon className="w-4 h-4" />}
                    />
                    <InputField
                      label="Tài xế"
                      value={driverName}
                      onChange={setDriverName}
                      placeholder="Tên tài xế"
                      disabled={false}
                      icon={<UserIcon className="w-4 h-4" />}
                    />
                    <InputField
                      label="Nhân viên cân"
                      value={operatorName}
                      onChange={setOperatorName}
                      placeholder="Tên nhân viên"
                      disabled={false}
                      icon={<UserIcon className="w-4 h-4" />}
                    />
                  </div>
                </div>

                {/* Cargo Section */}
                <div className="md:col-span-2 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-4 text-brand-success">
                    <PackageIcon className="w-5 h-5" />
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">
                      Hàng hoá & Đối tác
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Khách hàng"
                      value={customerName}
                      onChange={setCustomerName}
                      options={customers.map((c) => c.name)}
                      dataListId="customer-options"
                      placeholder="Chọn công ty"
                      disabled={false}
                      icon={<UserIcon className="w-4 h-4" />}
                    />
                    <InputField
                      label="Loại hàng"
                      value={productName}
                      onChange={setProductName}
                      options={products.map((p) => p.name)}
                      dataListId="product-options"
                      placeholder="Chọn hàng"
                      disabled={false}
                      icon={<PackageIcon className="w-4 h-4" />}
                    />
                  </div>
                </div>

                {/* Weight Section */}
                <div className="md:col-span-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-4 text-brand-accent">
                    <span className="font-bold text-sm">⚖️</span>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider">
                      Khối lượng
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField
                      label="Tổng tải (KG)"
                      type="number"
                      value={grossWeight}
                      onChange={(v) => setGrossWeight(Number(v))}
                      placeholder="0"
                      disabled={false}
                      icon={<span className="text-xs font-bold">G</span>}
                    />
                    <InputField
                      label="Tự trọng (KG)"
                      type="number"
                      value={tareWeight}
                      onChange={(v) => setTareWeight(Number(v))}
                      placeholder="0"
                      disabled={false}
                      icon={<span className="text-xs font-bold">T</span>}
                    />
                    <div>
                      <label className="block text-[10px] font-bold text-industrial-muted uppercase tracking-wider mb-1.5">
                        Khối lượng hàng (KG)
                      </label>
                      <div className="px-3 py-2.5 bg-white border border-industrial-border rounded-md text-industrial-text text-sm font-bold">
                        {Math.abs(grossWeight - tareWeight).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-industrial-muted uppercase tracking-wider mb-1.5">
                    Ghi chú
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Nhập ghi chú về tình trạng xe, hàng hóa..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-industrial-border rounded-md text-industrial-text text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-6 flex gap-3 justify-end">
                {isEditing && (
                  <button
                    onClick={() => {
                      resetForm();
                    }}
                    className="px-6 py-2.5 bg-slate-100 text-industrial-text rounded-lg font-bold uppercase text-sm hover:bg-slate-200 transition-colors"
                  >
                    Hủy
                  </button>
                )}
                <button
                  onClick={handleSaveTicket}
                  className="px-6 py-2.5 bg-brand-primary text-white rounded-lg font-bold uppercase text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <SaveIcon className="w-4 h-4" />
                  {isEditing ? 'Cập Nhật' : 'Lưu Nháp'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="max-w-6xl mx-auto">
            {/* Filter Section */}
            <div className="bg-white rounded-xl shadow-industrial border border-industrial-border p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-industrial-muted uppercase mb-2">
                    Tìm kiếm
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Biển số, số phiếu, khách hàng..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-industrial-border rounded-lg text-sm focus:ring-2 focus:ring-brand-primary/20 focus:bg-white"
                    />
                    <FilterIcon className="absolute left-3 top-2.5 w-4 h-4 text-industrial-muted" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-industrial-muted uppercase mb-2">
                    Trạng thái
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as TicketSubmissionStatus | '')}
                    className="w-full px-3 py-2 bg-slate-50 border border-industrial-border rounded-lg text-sm focus:ring-2 focus:ring-brand-primary/20"
                  >
                    <option value="">Tất cả</option>
                    <option value={TicketSubmissionStatus.DRAFT}>Nháp</option>
                    <option value={TicketSubmissionStatus.SUBMITTED}>Đã gửi</option>
                    <option value={TicketSubmissionStatus.APPROVED}>Đã duyệt</option>
                    <option value={TicketSubmissionStatus.REJECTED}>Bị từ chối</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tickets List */}
            {filteredTickets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onEdit={handleEditTicket}
                    onSubmit={handleSubmitTicket}
                    onDelete={handleDeleteTicket}
                    onPrint={onPrintRequest}
                    isSelected={selectedTicket?.id === ticket.id}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-industrial border border-industrial-border p-12 text-center">
                <ListIcon className="w-12 h-12 text-industrial-muted mx-auto mb-4 opacity-50" />
                <p className="text-industrial-muted font-semibold">Không có phiếu cân nào</p>
                <p className="text-sm text-industrial-muted mt-1">
                  Hãy tạo phiếu cân mới để bắt đầu
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

