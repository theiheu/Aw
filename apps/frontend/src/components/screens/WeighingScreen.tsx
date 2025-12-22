import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { WeighTicket, Vehicle, Customer, Product, TicketStatus, User, StationInfo } from '../../types';
import {
  TruckIcon,
  UserIcon,
  PackageIcon,
  CheckCircleIcon,
  HourglassIcon,
  FileCheckIcon,
  FilterIcon,
  EditIcon,
  SaveIcon,
  XIcon,
} from '../common/icons';
import { UI_CONFIG, PAGINATION } from '../../constants/app';

interface WeighingScreenProps {
  processWeighing: (data: {
    plateNumber: string;
    customerName: string;
    productName: string;
    driverName: string;
    operatorName: string;
    weight: number;
    type: 'single' | 'first';
    notes?: string;
  }) => void;
  updateTicket: (ticket: WeighTicket) => void;
  vehicles: Vehicle[];
  customers: Customer[];
  products: Product[];
  tickets: WeighTicket[];
  onPrintRequest: (ticket: WeighTicket) => void;
  currentUser: User;
  stationInfo: StationInfo;
}

// --- FIX: InputField moved OUTSIDE component to prevent re-render focus loss ---
const InputField: React.FC<{
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder: string;
  options?: string[];
  dataListId?: string; // unused in new UI, kept for compatibility
  disabled?: boolean;
  icon: React.ReactNode;
  className?: string;
  type?: string;
}> = React.memo(({
  label,
  value,
  onChange,
  placeholder,
  options,
  dataListId,
  disabled,
  icon,
  className,
  type = 'text',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => {
    const v = String(((open ? query : value) || '')).toLowerCase();
    const src = options || [];
    const filtered = v ? src.filter((o) => o.toLowerCase().includes(v)) : src.slice(0, 50);
    return filtered.slice(0, 100);
  }, [options, query, value, open]);

  const scrollToIndex = (idx: number) => {
    if (!listRef.current) return;
    const child = listRef.current.children[idx] as HTMLElement | undefined;
    if (child && typeof child.scrollIntoView === 'function') {
      child.scrollIntoView({ block: 'nearest' });
    }
  };

  const applyHighlight = (idx: number, updateValue: boolean) => {
    const clamped = Math.max(0, Math.min(idx, Math.max(items.length - 1, 0)));
    setHighlight(clamped);
    if (updateValue) {
      const chosen = items[clamped];
      if (chosen) onChange(chosen);
    }
    // Ensure the item is visible
    setTimeout(() => scrollToIndex(clamped), 0);
  };

  useEffect(() => {
    if (open) {
      const currentIdx = items.findIndex((o) => String(o) === String(value));
      setHighlight(currentIdx >= 0 ? currentIdx : 0);
      setTimeout(() => scrollToIndex(currentIdx >= 0 ? currentIdx : 0), 0);
    }
  }, [open, value, options, query]);

  const isCombo = !!options && options.length > 0 && type === 'text' && !disabled;

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);


  useEffect(() => setHighlight(0), [open, options, query, value]);

  const handleInputChange = (val: string) => {
    onChange(val);
    if (isCombo) {
      setQuery(val);
      if (!open) setOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCombo || !open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      applyHighlight(highlight + 1, false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      applyHighlight(highlight - 1, false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = items[highlight];
      if (chosen) {
        onChange(chosen);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!isCombo || !open || items.length === 0) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    applyHighlight(highlight + dir, true);
  };

  const showClear = !disabled && String(value || '').length > 0;

  return (
    <div className={className} ref={containerRef}>
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
          value={String(value)}
          onFocus={() => isCombo && setOpen(true)}
          onClick={() => isCombo && setOpen(true)}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-industrial-border rounded-md text-industrial-text text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
        />
        {showClear && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
            aria-label="Xoá nội dung"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}

        {isCombo && open && (
          <div ref={listRef} onWheel={handleWheel} className="absolute z-50 mt-1 left-0 right-0 bg-white border border-industrial-border rounded-md shadow-lg max-h-56 overflow-auto">
            {items.length > 0 ? (
              items.map((opt, idx) => {
                const active = idx === highlight;
                return (
                  <button
                    type="button"
                    key={opt + idx}
                    onMouseEnter={() => setHighlight(idx)}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm ${active ? 'bg-blue-600 text-white' : 'hover:bg-slate-50'} transition-colors`}
                  >
                    {opt}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500">Không có kết quả</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const TextAreaField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  icon: React.ReactNode;
  className?: string;
}> = React.memo(({ label, value, onChange, placeholder, disabled, icon, className }) => (
  <div className={className}>
    <label className="block text-[10px] font-bold text-industrial-muted uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <div className="relative group">
      <div
        className={`absolute top-3 left-3 flex items-center pointer-events-none transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-brand-primary'}`}
      >
        {icon}
      </div>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-industrial-border rounded-md text-industrial-text text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white disabled:bg-slate-100 transition-all"
      ></textarea>
    </div>
  </div>
));

// --- Industrial Digital Display Component ---
const DigitalDisplay: React.FC<{ weight: number; status: string; isMobile?: boolean }> = React.memo(
  ({ weight, status, isMobile }) => {
        const formattedWeight = Math.floor(weight).toLocaleString('vi-VN');

    const getStatusColor = (s: string) => {
      if (s === 'connected') return 'bg-digital-on shadow-[0_0_5px_#00ff41]';
      if (s === 'connecting') return 'bg-yellow-500 shadow-[0_0_5px_yellow] animate-pulse';
      if (s === 'error') return 'bg-red-500 shadow-[0_0_5px_red] animate-pulse';
      return 'bg-slate-500 shadow-[0_0_5px_gray]';
    };

    const getStatusText = (s: string) => {
      if (s === 'connected') return 'ONLINE';
      if (s === 'connecting') return 'WAITING...';
      if (s === 'error') return 'ERROR';
      return 'OFFLINE';
    };

    if (isMobile) {
      // --- MOBILE COMPACT VIEW ---
      return (
        <div className="bg-gray-900 p-3 shadow-md border-b-4 border-brand-primary relative overflow-hidden flex items-center justify-between">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(0deg, transparent 24%, #222 25%, #222 26%, transparent 27%, transparent 74%, #222 75%, #222 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #222 25%, #222 26%, transparent 27%, transparent 74%, #222 75%, #222 76%, transparent 77%, transparent)',
              backgroundSize: '20px 20px',
            }}
          ></div>

          {/* Left: Status */}
          <div className="flex flex-col gap-1 z-10 pl-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>
              <span
                className={`text-[10px] font-mono uppercase tracking-widest ${status === 'error' ? 'text-red-500 font-bold' : 'text-gray-400'}`}
              >
                {getStatusText(status)}
              </span>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-gray-600">
              STABLE
            </span>
          </div>

          {/* Right: Weight & Unit */}
          <div className="flex items-baseline gap-1 z-10">
            <div className="font-digital text-5xl font-bold tracking-wider text-digital-on digital-text-shadow tabular-nums leading-none">
              {formattedWeight}
            </div>
            <div className="text-gray-500 font-mono text-sm font-bold">KG</div>
          </div>
        </div>
      );
    }

    // --- DESKTOP FULL VIEW ---
    return (
      <div className="bg-gray-900 rounded-xl p-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] border-2 border-gray-700 relative">
        {/* Bezel Screws (Visual) */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>

        <div className="bg-black rounded-lg border-4 border-gray-800 relative overflow-hidden h-40 sm:h-48 flex flex-col items-center justify-center">
          {/* Background Grid Line */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(0deg, transparent 24%, #222 25%, #222 26%, transparent 27%, transparent 74%, #222 75%, #222 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #222 25%, #222 26%, transparent 27%, transparent 74%, #222 75%, #222 76%, transparent 77%, transparent)',
              backgroundSize: '30px 30px',
            }}
          ></div>

          {/* Status Indicators */}
          <div className="absolute top-4 w-full px-6 flex justify-between items-center z-10">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>
              <span
                className={`text-[10px] font-mono uppercase tracking-widest ${status === 'error' ? 'text-red-500 font-bold' : 'text-gray-500'}`}
              >
                {getStatusText(status)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                STABLE
              </span>
              <div
                className={`w-2 h-2 rounded-full ${weight > 0 && status === 'connected' ? 'bg-digital-on shadow-[0_0_8px_#00ff41]' : 'bg-gray-800'}`}
              ></div>
            </div>
          </div>

          {/* Main Digits */}
          <div className="font-digital text-7xl sm:text-8xl font-bold tracking-widest text-digital-on digital-text-shadow z-10 tabular-nums">
            {formattedWeight}
          </div>

          {/* Unit */}
          <div className="absolute bottom-4 right-6 text-gray-500 font-mono text-lg font-bold z-10">
            KG
          </div>

          {/* Zero Indicator */}
          {weight === 0 && (
            <div className="absolute bottom-4 left-6 text-brand-accent font-mono text-xs font-bold z-10 tracking-widest">
              ZERO
            </div>
          )}
        </div>
      </div>
    );
  }
);

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

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);
  return matches;
};

// Table Row Component for List View - MEMOIZED for performance
const TicketRow: React.FC<{
  t: WeighTicket;
  onClick: (t: WeighTicket) => void;
  isSelected: boolean;
}> = React.memo(({ t, onClick, isSelected }) => (
  <div
    onClick={() => onClick(t)}
    className={`p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-all ${isSelected ? 'bg-blue-50 border-l-4 border-l-brand-primary' : 'border-l-4 border-l-transparent'}`}
  >
    {/* Optimized Layout for Mobile */}
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
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5">📦 {t.product.name}</span>
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

// Fix: FilterControls defined outside to maintain focus
const FilterControls: React.FC<{
  filters: any;
  handleFilterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}> = React.memo(({ filters, handleFilterChange }) => (
  <div className="bg-slate-50 p-3 rounded-lg border border-industrial-border mb-3 animate-in fade-in duration-300">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div>
        <label className="block text-[10px] font-bold text-industrial-muted uppercase mb-1">
          Từ ngày
        </label>
        <input
          type="date"
          name="dateStart"
          value={filters.dateStart}
          onChange={handleFilterChange}
          className="w-full p-2 bg-white border border-industrial-border rounded text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-industrial-muted uppercase mb-1">
          Đến ngày
        </label>
        <input
          type="date"
          name="dateEnd"
          value={filters.dateEnd}
          onChange={handleFilterChange}
          className="w-full p-2 bg-white border border-industrial-border rounded text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-industrial-muted uppercase mb-1">
          Trạng thái
        </label>
        <select
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="w-full p-2 bg-white border border-industrial-border rounded text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
        >
          <option value="">Tất cả</option>
          {Object.values(TicketStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
));

export const WeighingScreen: React.FC<WeighingScreenProps> = (props) => {
  const { weight, status: connectionStatus } = useWebSocket();
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const [selectedTicket, setSelectedTicket] = useState<WeighTicket | null>(null);
  const [isEditing, setIsEditing] = useState(false); // State for manual edit mode

  const [plateNumber, setPlateNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productName, setProductName] = useState('');
  const [driver, setDriver] = useState('');
  // Initialize with default value from settings or fallback to current user
  const [operatorName, setOperatorName] = useState(
    props.stationInfo.defaultOperatorName || props.currentUser.name
  );
  const [notes, setNotes] = useState('');

  // States for Manual Weight Editing
  const [editGross, setEditGross] = useState<number>(0);
  const [editTare, setEditTare] = useState<number>(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [activeMobileTab, setActiveMobileTab] = useState<'weigh' | 'list'>('weigh');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    status: '',
    customerId: '',
    productId: '',
  });

  // Pagination state for list rendering performance
  const [visibleCount, setVisibleCount] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);

  // Debounce search term to reduce filtering frequency
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearchTerm(searchTerm), UI_CONFIG.DEBOUNCE_DELAY);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(PAGINATION.DEFAULT_PAGE_SIZE);
  }, [debouncedSearchTerm, filters.dateStart, filters.dateEnd, filters.status, filters.customerId, filters.productId]);

  // --- SWIPE LOGIC ---
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const MIN_SWIPE_DISTANCE = 50;

  const formMode = useMemo(() => {
    if (!selectedTicket) return 'new';
    if (selectedTicket.status === TicketStatus.PENDING_SECOND_WEIGH) return 'second_weigh';
    return 'view_completed';
  }, [selectedTicket]);

  const vehicleOptions = useMemo(() => props.vehicles.map((v) => v.plateNumber), [props.vehicles]);
  const customerOptions = useMemo(() => props.customers.map((c) => c.name), [props.customers]);
  const productOptions = useMemo(() => props.products.map((p) => p.name), [props.products]);

  const filteredTickets = useMemo(() => {
    return props.tickets.filter((ticket) => {
      const lowerCaseSearchTerm = debouncedSearchTerm.toLowerCase();
      const searchMatch =
        !debouncedSearchTerm ||
        ticket.ticketNo.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.vehicle.plateNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.customer.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        ticket.driverName.toLowerCase().includes(lowerCaseSearchTerm);
      if (!searchMatch) return false;

      const weighInDate = new Date(ticket.weighInTime);
      weighInDate.setHours(0, 0, 0, 0);

      if (
        filters.dateStart &&
        weighInDate < new Date(new Date(filters.dateStart).setHours(0, 0, 0, 0))
      )
        return false;
      if (filters.dateEnd && weighInDate > new Date(new Date(filters.dateEnd).setHours(0, 0, 0, 0)))
        return false;
      if (filters.status && ticket.status !== filters.status) return false;
      if (filters.customerId && ticket.customer.id !== filters.customerId) return false;
      if (filters.productId && ticket.product.id !== filters.productId) return false;

      return true;
    });
  }, [props.tickets, debouncedSearchTerm, filters]);

  // Live net preview for second weigh
  const liveNet = useMemo(() => {
    if (!selectedTicket || formMode !== 'second_weigh') return 0;
    const g = Number(selectedTicket.grossWeight || 0);
    return Math.abs(g - Number(weight || 0));
  }, [selectedTicket, formMode, weight]);

  // --- AUTO-FILL LOGIC ---
  useEffect(() => {
    if (formMode === 'new' && plateNumber.length >= 3) {
      const foundVehicle = props.vehicles.find(
        (v) => v.plateNumber.toLowerCase() === plateNumber.toLowerCase()
      );
      if (foundVehicle) {
        if (foundVehicle.lastCustomerName) setCustomerName(foundVehicle.lastCustomerName);
        if (foundVehicle.lastProductName) setProductName(foundVehicle.lastProductName);
        if (foundVehicle.lastDriverName) setDriver(foundVehicle.lastDriverName);
      }
    }
  }, [plateNumber, formMode, props.vehicles]);

  useEffect(() => {
    if (selectedTicket) {
      setIsEditing(false);
      setPlateNumber(selectedTicket.vehicle.plateNumber);
      setCustomerName(selectedTicket.customer.name);
      setProductName(selectedTicket.product.name);
      setDriver(selectedTicket.driverName);
      setOperatorName(
        selectedTicket.operatorName ||
          selectedTicket.signedBy ||
          props.stationInfo.defaultOperatorName ||
          props.currentUser.name
      );
      setNotes(selectedTicket.notes || '');
      setEditGross(selectedTicket.grossWeight || 0);
      setEditTare(selectedTicket.tareWeight || 0);
    } else {
      setIsEditing(false);
      setPlateNumber('');
      setCustomerName('');
      setProductName('');
      setDriver('');
      setNotes('');
      setEditGross(0);
      setEditTare(0);
      setOperatorName(props.stationInfo.defaultOperatorName || props.currentUser.name);
    }
  }, [selectedTicket, props.currentUser.name, props.stationInfo.defaultOperatorName]);

  // --- Ticket Navigation & Selection Logic ---
  const handleTicketSelect = useCallback(
    (ticket: WeighTicket) => {
      setSelectedTicket(ticket);
      if (isMobile) setActiveMobileTab('weigh');
    },
    [isMobile]
  );

  const navigateTicket = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedTicket || filteredTickets.length === 0) return;

      const currentIndex = filteredTickets.findIndex((t) => t.id === selectedTicket.id);
      if (currentIndex === -1) return;

      let newIndex;
      if (direction === 'prev') {
        newIndex = currentIndex - 1;
      } else {
        newIndex = currentIndex + 1;
      }

      if (newIndex >= 0 && newIndex < filteredTickets.length) {
        setSelectedTicket(filteredTickets[newIndex]);
      }
    },
    [selectedTicket, filteredTickets]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (
      !touchStart ||
      !touchEnd ||
      !selectedTicket ||
      formMode === 'new' ||
      activeMobileTab !== 'weigh' ||
      isEditing
    )
      return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
    const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

    if (isLeftSwipe) navigateTicket('next');
    if (isRightSwipe) navigateTicket('prev');
  };

  // --- Handlers for New/Process Weighing ---
  const handleSubmit = useCallback(
    (type: 'first' | 'single' | 'second') => {
      if (connectionStatus !== 'connected' || weight <= 0) {
        alert('Chưa nhận được dữ liệu hợp lệ từ trạm cân. Vui lòng kiểm tra kết nối.');
        return;
      }
      if (type === 'second') {
        if (!selectedTicket || formMode !== 'second_weigh') return;
        const updatedCustomer = { ...selectedTicket.customer, name: customerName };
        const updatedProduct = { ...selectedTicket.product, name: productName };
        const updatedTicket: WeighTicket = {
          ...selectedTicket,
          customer: updatedCustomer,
          product: updatedProduct,
          driverName: driver,
          operatorName: operatorName,
          notes: notes,
          tareWeight: weight,
          netWeight: Math.abs(selectedTicket.grossWeight - weight),
          weighOutTime: new Date(),
          status: TicketStatus.COMPLETED,
        };
        props.updateTicket(updatedTicket);
      } else {
        props.processWeighing({
          plateNumber,
          customerName,
          productName,
          driverName: driver,
          operatorName,
          weight: weight,
          type,
          notes,
        });
      }
      setSelectedTicket(null);
    },
    [
      connectionStatus,
      weight,
      selectedTicket,
      formMode,
      plateNumber,
      customerName,
      productName,
      driver,
      operatorName,
      notes,
      props.processWeighing,
      props.updateTicket,
    ]
  );

  const handleEditToggle = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (selectedTicket) {
      setPlateNumber(selectedTicket.vehicle.plateNumber);
      setCustomerName(selectedTicket.customer.name);
      setProductName(selectedTicket.product.name);
      setDriver(selectedTicket.driverName);
      setOperatorName(selectedTicket.operatorName || selectedTicket.signedBy || '');
      setNotes(selectedTicket.notes || '');
      setEditGross(selectedTicket.grossWeight);
      setEditTare(selectedTicket.tareWeight);
    }
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!selectedTicket) return;

    const updatedCustomer = { ...selectedTicket.customer, name: customerName };
    const updatedProduct = { ...selectedTicket.product, name: productName };
    const updatedVehicle = { ...selectedTicket.vehicle, plateNumber: plateNumber };

    const newNet = Math.abs(editGross - editTare);

    const updatedTicket: WeighTicket = {
      ...selectedTicket,
      vehicle: updatedVehicle,
      customer: updatedCustomer,
      product: updatedProduct,
      driverName: driver,
      operatorName: operatorName,
      notes: notes,
      grossWeight: editGross,
      tareWeight: editTare,
      netWeight: newNet,
    };

    props.updateTicket(updatedTicket);
    setIsEditing(false);
    alert('Đã cập nhật phiếu cân thành công!');
  };

  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGINATION.ITEMS_PER_LOAD, filteredTickets.length));
  }, [filteredTickets.length]);

  // Create New Ticket: reset form state and switch to weigh tab on mobile
  const handleCreateNewTicket = useCallback(() => {
    setSelectedTicket(null);
    setIsEditing(false);
    setPlateNumber('');
    setCustomerName('');
    setProductName('');
    setDriver('');
    setNotes('');
    setEditGross(0);
    setEditTare(0);
    setOperatorName(props.stationInfo.defaultOperatorName || props.currentUser.name);
    if (isMobile) setActiveMobileTab('weigh');
  }, [isMobile, props.currentUser.name, props.stationInfo.defaultOperatorName]);

  const renderActionButtons = () => {
    const commonDisabled = connectionStatus !== 'connected';

    const BtnClass =
      'flex flex-col items-center justify-center p-3 rounded-lg shadow-md transition-all duration-200 group border active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

    if (isEditing) {
      return (
        <div className="grid grid-cols-2 gap-3 pt-4">
          <button
            onClick={handleSaveEdit}
            className={`${BtnClass} bg-brand-success text-white border-brand-success hover:bg-emerald-600 col-span-1`}
          >
            <div className="flex items-center gap-2">
              <SaveIcon className="w-5 h-5" />
              <span className="font-bold uppercase">Lưu Thay Đổi</span>
            </div>
          </button>
          <button
            onClick={handleCancelEdit}
            className={`${BtnClass} bg-slate-100 text-industrial-text border-slate-300 hover:bg-slate-200 col-span-1`}
          >
            <span className="font-bold uppercase">Hủy Bỏ</span>
          </button>
        </div>
      );
    }

    switch (formMode) {
      case 'new':
        return (
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={() => handleSubmit('first')}
              disabled={commonDisabled}
              className={`${BtnClass} bg-brand-primary border-brand-primary hover:bg-blue-700 text-white col-span-1`}
            >
              <div className="flex items-center gap-2">
                <HourglassIcon className="w-5 h-5" />
                <span className="font-bold text-base uppercase tracking-wide">Cân Lần 1</span>
              </div>
              <span className="text-[10px] text-blue-100 font-medium mt-1 opacity-80">
                Xe vào bãi
              </span>
            </button>
            <button
              onClick={() => handleSubmit('single')}
              disabled={commonDisabled}
              className={`${BtnClass} bg-white border-industrial-border hover:bg-slate-50 text-industrial-text col-span-1`}
            >
              <div className="flex items-center gap-2 text-brand-secondary">
                <CheckCircleIcon className="w-5 h-5" />
                <span className="font-bold text-base uppercase tracking-wide">Cân 1 Lần</span>
              </div>
              <span className="text-[10px] text-industrial-muted font-medium mt-1">
                Dịch vụ / Xe rỗng
              </span>
            </button>
          </div>
        );
      case 'second_weigh':
        return (
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={() => handleSubmit('second')}
              disabled={connectionStatus !== 'connected'}
              className={`${BtnClass} bg-brand-accent border-brand-accent hover:bg-amber-600 text-white col-span-2`}
            >
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6" />
                <span className="font-bold text-lg uppercase tracking-wide">
                  Xác nhận Cân Lần 2
                </span>
              </div>
              <span className="text-xs text-white/80 font-medium mt-1">Hoàn tất phiếu cân</span>
            </button>

            <button
              onClick={handleEditToggle}
              className={`${BtnClass} bg-white text-brand-secondary border-industrial-border hover:bg-slate-50 col-span-2`}
            >
              <div className="flex items-center gap-2">
                <EditIcon className="w-4 h-4" />
                <span className="font-bold uppercase text-sm">Sửa Thông Tin</span>
              </div>
            </button>
          </div>
        );
      case 'view_completed':
        if (!selectedTicket) return null;
        return (
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={() => props.onPrintRequest(selectedTicket)}
              className={`${BtnClass} bg-industrial-text text-white border-industrial-text hover:bg-black col-span-1`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase">In Phiếu</span>
              </div>
            </button>
            <button
              onClick={handleEditToggle}
              className={`${BtnClass} bg-brand-accent text-white border-brand-accent hover:bg-amber-600 col-span-1`}
            >
              <div className="flex items-center gap-2">
                <EditIcon className="w-5 h-5" />
                <span className="font-bold uppercase">Sửa Phiếu</span>
              </div>
            </button>
          </div>
        );
    }
  };

  // Mobile View
  if (isMobile) {
    const slicedTickets = filteredTickets.slice(0, visibleCount);
    return (
      <div className="h-full flex flex-col bg-industrial-bg overflow-hidden">
        <div className="shrink-0">
          <DigitalDisplay weight={weight} status={connectionStatus} isMobile={true} />
        </div>



        <div className="border-b border-industrial-border bg-white shrink-0 shadow-sm z-10">
          <nav className="flex">
            <button
              onClick={() => setActiveMobileTab('weigh')}
              className={`flex-1 py-3 text-center font-bold text-xs uppercase tracking-wider border-b-2 transition-colors ${activeMobileTab === 'weigh' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-industrial-muted'}`}
            >
              Điều khiển
            </button>
            <button
              onClick={() => setActiveMobileTab('list')}
              className={`flex-1 py-3 text-center font-bold text-xs uppercase tracking-wider border-b-2 transition-colors ${activeMobileTab === 'list' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-industrial-muted'}`}
            >
              Danh sách
            </button>
          </nav>
        </div>


        <div
          className="flex-grow overflow-y-auto p-4 custom-scrollbar pb-24 touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {activeMobileTab === 'weigh' && (
            <>
              {selectedTicket &&
                selectedTicket.status !== TicketStatus.PENDING_SECOND_WEIGH &&
                !isEditing && (
                  <div className="text-center mb-2 text-[10px] text-industrial-muted uppercase tracking-wider opacity-70 flex items-center justify-center gap-2">
                    <span>⟵ Vuốt trái (Cũ hơn)</span>
                    <span>•</span>
                    <span>Vuốt phải (Mới hơn) ⟶</span>
                  </div>
                )}

              {isEditing && (
                <div className="mb-4 p-3 bg-amber-100 border border-amber-300 rounded-lg flex justify-center items-center text-amber-800 text-sm shadow-sm">
                  <EditIcon className="w-4 h-4 mr-2" />
                  <span className="font-bold uppercase">Đang chế độ chỉnh sửa</span>
                </div>
              )}



              {/* Live preview for second weigh (mobile) */}
              {formMode === 'second_weigh' && selectedTicket && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded border border-industrial-border">
                    <div className="text-[11px] text-industrial-muted uppercase mb-1">Cân lần 1</div>
                    <div className="text-sm font-bold">
                      {selectedTicket.grossWeight.toLocaleString('vi-VN')} kg
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {new Date(selectedTicket.weighInTime).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded border border-industrial-border">
                    <div className="text-[11px] text-industrial-muted uppercase mb-1">Cân lần 2 (Live)</div>
                                        <div className="text-sm font-bold">{Math.floor(weight).toLocaleString('vi-VN')} kg</div>
                  </div>
                  <div className="col-span-2 bg-emerald-50 p-3 rounded border border-emerald-200">
                    <div className="text-[11px] text-emerald-700 uppercase mb-1">
                      Trọng lượng hàng (tạm tính)
                    </div>
                    <div className="text-xl font-black text-emerald-800">
                      {liveNet.toLocaleString('vi-VN')} kg
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="bg-white p-4 rounded-lg border border-industrial-border shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-brand-primary border-b border-slate-100 pb-2">
                    <TruckIcon className="w-4 h-4" />
                    <h3 className="font-extrabold text-xs uppercase tracking-wider">
                      Vận tải & Tài xế
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <InputField
                      label="Biển số xe"
                      value={plateNumber}
                      onChange={setPlateNumber}
                      options={vehicleOptions}
                      dataListId="vehicle-options"
                      placeholder="59C-12345"
                      disabled={formMode !== 'new' && !isEditing}
                      icon={<TruckIcon className="w-4 h-4" />}
                    />
                    <InputField
                      label="Tài xế"
                      value={driver}
                      onChange={setDriver}
                      placeholder="Tên tài xế"
                      disabled={formMode !== 'new' && !isEditing}
                      icon={<UserIcon className="w-4 h-4" />}
                    />
                    <InputField
                      label="Nhân viên cân"
                      value={operatorName}
                      onChange={setOperatorName}
                      placeholder="Tên nhân viên trực"
                      disabled={!isEditing && formMode !== 'new'}
                      icon={<UserIcon className="w-4 h-4" />}
                    />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-industrial-border shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-brand-success border-b border-slate-100 pb-2">
                    <PackageIcon className="w-4 h-4" />
                    <h3 className="font-extrabold text-xs uppercase tracking-wider">Hàng hoá</h3>
                  </div>
                  <div className="space-y-3">
                    <InputField
                      label="Khách hàng"
                      value={customerName}
                      onChange={setCustomerName}
                      options={customerOptions}
                      dataListId="customer-options"
                      placeholder="Chọn đối tác"
                      disabled={formMode !== 'new' && !isEditing}
                      icon={<UserIcon className="w-4 h-4" />}
                    />
                    <InputField
                      label="Loại hàng"
                      value={productName}
                      onChange={setProductName}
                      options={productOptions}
                      dataListId="product-options"
                      placeholder="Chọn hàng hoá"
                      disabled={formMode !== 'new' && !isEditing}
                      icon={<PackageIcon className="w-4 h-4" />}
                    />
                    <TextAreaField
                      label="Ghi chú"
                      value={notes}
                      onChange={setNotes}
                      placeholder="..."
                      disabled={!isEditing && formMode !== 'new' && formMode !== 'second_weigh'}
                      icon={<EditIcon className="w-4 h-4" />}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="bg-white p-4 rounded-lg border border-industrial-border shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-brand-accent border-b border-slate-100 pb-2">
                      <EditIcon className="w-4 h-4" />
                      <h3 className="font-extrabold text-xs uppercase tracking-wider">
                        Điều chỉnh khối lượng
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <InputField
                        label="Tổng tải (KG)"
                        type="number"
                        value={editGross}
                        onChange={(v) => setEditGross(Number(v))}
                        placeholder="0"
                        disabled={false}
                        icon={<span className="text-[10px] font-bold">G</span>}
                      />
                      <InputField
                        label="Tự trọng (KG)"
                        type="number"
                        value={editTare}
                        onChange={(v) => setEditTare(Number(v))}
                        placeholder="0"
                        disabled={false}
                        icon={<span className="text-[10px] font-bold">T</span>}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4">
                {renderActionButtons()}
              </div>

            </>
          )}

          {activeMobileTab === 'list' && (
            <div className="bg-white rounded-lg shadow-sm border border-industrial-border overflow-hidden min-h-full">
              <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow p-2 bg-white border border-industrial-border rounded text-sm"
                  />
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded border ${showFilters ? 'bg-brand-primary text-white' : 'bg-white'}`}
                  >
                    <FilterIcon className="w-5 h-5" />
                  </button>
                </div>
                {showFilters && (
                  <div className="mt-2">
                    <FilterControls filters={filters} handleFilterChange={handleFilterChange} />
                  </div>
                )}
              </div>
              <div>
                {slicedTickets.map((t) => (
                  <TicketRow
                    key={t.id}
                    t={t}
                    onClick={handleTicketSelect}
                    isSelected={selectedTicket?.id === t.id}
                  />
                ))}
                {visibleCount < filteredTickets.length && (
                  <div className="p-3 flex justify-center border-t border-slate-100 bg-slate-50">
                    <button
                      onClick={handleLoadMore}
                      className="px-4 py-2 text-sm font-bold rounded border border-industrial-border hover:bg-white"
                    >
                      Tải thêm ({filteredTickets.length - visibleCount} còn lại)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop View - 2 Column Layout
  const slicedTickets = filteredTickets.slice(0, visibleCount);
  return (
    <div className="h-full w-full grid grid-cols-1 lg:grid-cols-12 bg-industrial-bg overflow-hidden min-h-0">
      {/* COLUMN 1: OPERATION (Scale + Form) - Spans 7 columns */}
      <div className="col-span-12 lg:col-span-7 flex flex-col h-full min-h-0 overflow-hidden border-r border-industrial-border bg-white shadow-[10px_0_30px_-10px_rgba(0,0,0,0.05)] z-10">
        {/* Scale Header */}
        <div className="p-6 bg-slate-50 border-b border-industrial-border shrink-0">
          <DigitalDisplay weight={weight} status={connectionStatus} isMobile={false} />
          {(selectedTicket || formMode !== 'new') && (
            <div className="mt-4">
              <button
                onClick={handleCreateNewTicket}
                className="w-full px-4 py-3 text-base font-bold rounded-lg border-2 border-brand-primary bg-white text-brand-primary hover:bg-blue-50 active:scale-95 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-xl">+</span>
                <span>Tạo phiếu mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Operation Form - Scrollable Area */}
        <div className="flex-grow min-h-0 overflow-y-auto p-6 pb-6 custom-scrollbar">
          {isEditing && (
            <div className="mb-6 p-3 bg-amber-100 border border-amber-300 rounded-lg flex justify-center items-center text-amber-800 text-sm shadow-sm animate-pulse">
              <EditIcon className="w-5 h-5 mr-2" />
              <span className="font-bold uppercase">Đang trong chế độ chỉnh sửa phiếu</span>
            </div>
          )}


          {/* Live preview for second weigh (desktop) */}
          {formMode === 'second_weigh' && selectedTicket && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded border border-industrial-border">
                <div className="text-[11px] text-industrial-muted uppercase mb-1">Cân lần 1</div>
                <div className="text-lg font-bold">
                  {selectedTicket.grossWeight.toLocaleString('vi-VN')} kg
                </div>
                <div className="text-[12px] text-slate-500 mt-1">
                  {new Date(selectedTicket.weighInTime).toLocaleString('vi-VN')}
                </div>
              </div>
              <div className="bg-white p-4 rounded border border-industrial-border">
                <div className="text-[11px] text-industrial-muted uppercase mb-1">Cân lần 2 (Live)</div>
                                <div className="text-lg font-bold">{Math.floor(weight).toLocaleString('vi-VN')} kg</div>
                <div className="text-[12px] text-slate-500 mt-1">Đang cập nhật...</div>
              </div>
              <div className="bg-emerald-50 p-4 rounded border border-emerald-200">
                <div className="text-[11px] text-emerald-700 uppercase mb-1">
                  Trọng lượng hàng (tạm tính)
                </div>
                <div className="text-2xl font-black text-emerald-800">
                  {liveNet.toLocaleString('vi-VN')} kg
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            {/* Section: Transport */}
            <div className="bg-white p-5 rounded-xl border border-industrial-border shadow-industrial hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-5 text-brand-primary">
                <TruckIcon className="w-5 h-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">
                  Thông tin vận tải
                </h3>
              </div>
              <div className="space-y-4">
                <InputField
                  label="Biển số xe"
                  value={plateNumber}
                  onChange={setPlateNumber}
                  options={vehicleOptions}
                  dataListId="vehicle-options"
                  placeholder="59C-XXX.XX"
                  disabled={formMode !== 'new' && !isEditing}
                  icon={<TruckIcon className="w-4 h-4" />}
                />
                <InputField
                  label="Tài xế"
                  value={driver}
                  onChange={setDriver}
                  placeholder="Họ tên tài xế"
                  disabled={formMode !== 'new' && !isEditing}
                  icon={<UserIcon className="w-4 h-4" />}
                />
                <InputField
                  label="Nhân viên cân"
                  value={operatorName}
                  onChange={setOperatorName}
                  placeholder="Tên nhân viên trực"
                  disabled={!isEditing && formMode !== 'new'}
                  icon={<UserIcon className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Section: Cargo */}
            <div className="bg-white p-5 rounded-xl border border-industrial-border shadow-industrial hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-5 text-brand-success">
                <PackageIcon className="w-5 h-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">
                  Hàng hoá & Đối tác
                </h3>
              </div>
              <div className="space-y-4">
                <InputField
                  label="Khách hàng"
                  value={customerName}
                  onChange={setCustomerName}
                  options={customerOptions}
                  dataListId="customer-options"
                  placeholder="Chọn công ty"
                  disabled={formMode !== 'new' && !isEditing}
                  icon={<UserIcon className="w-4 h-4" />}
                />
                <InputField
                  label="Loại hàng"
                  value={productName}
                  onChange={setProductName}
                  options={productOptions}
                  dataListId="product-options"
                  placeholder="Chọn hàng"
                  disabled={formMode !== 'new' && !isEditing}
                  icon={<PackageIcon className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Section: Weight Correction (Visible only when editing) */}
            {isEditing && (
              <div className="col-span-2 bg-amber-50 p-5 rounded-xl border border-amber-200 shadow-inner">
                <div className="flex items-center gap-2 mb-3 text-amber-700">
                  <EditIcon className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    Điều chỉnh khối lượng thủ công
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <InputField
                    label="Tổng tải (Gross - KG)"
                    type="number"
                    value={editGross}
                    onChange={(v) => setEditGross(Number(v))}
                    placeholder="0"
                    disabled={false}
                    icon={<span className="text-xs font-bold">G</span>}
                  />
                  <InputField
                    label="Tự trọng (Tare - KG)"
                    type="number"
                    value={editTare}
                    onChange={(v) => setEditTare(Number(v))}
                    placeholder="0"
                    disabled={false}
                    icon={<span className="text-xs font-bold">T</span>}
                  />
                </div>
              </div>
            )}

            {/* Section: Notes (Full Width) */}
            <div className="col-span-2">
              <TextAreaField
                label="Ghi chú thêm"
                value={notes}
                onChange={setNotes}
                placeholder="Nhập ghi chú về tình trạng xe, hàng hóa..."
                disabled={!isEditing && formMode !== 'new' && formMode !== 'second_weigh'}
                icon={<EditIcon className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Action buttons for desktop */}
          <div className="bg-white border-t border-industrial-border p-4 shadow-lg mt-6">
            {renderActionButtons()}
          </div>
        </div>
      </div>

      {/* COLUMN 2: DATA LIST - Spans 5 columns */}
      <div className="col-span-12 lg:col-span-5 flex flex-col h-full min-h-0 overflow-hidden bg-slate-50/50">
        <div className="p-4 border-b border-industrial-border bg-white flex justify-between items-center shadow-sm h-[88px]">
          {' '}
          {/* Fixed height to match header */}
          <div>
            <h2 className="text-lg font-extrabold text-industrial-text uppercase tracking-tight">
              Lịch sử
            </h2>
            <p className="text-xs text-industrial-muted">Danh sách phiếu cân gần đây</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-all ${showFilters ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-industrial-muted border-industrial-border hover:border-brand-primary'}`}
            >
              <FilterIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 bg-white border-b border-industrial-border">
            <FilterControls filters={filters} handleFilterChange={handleFilterChange} />
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 bg-white border-b border-industrial-border">
          <div className="relative">
            <input
              type="text"
              placeholder="Tìm nhanh (Biển số, số phiếu)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-industrial-border rounded-lg text-sm focus:ring-2 focus:ring-brand-primary/20 focus:bg-white transition-all"
            />
            <div className="absolute left-3 top-2.5 text-industrial-muted">
              <FilterIcon className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
          <div className="bg-white rounded-xl shadow-sm border border-industrial-border overflow-hidden">
            {slicedTickets.length > 0 ? (
              <>
                {slicedTickets.map((t) => (
                  <TicketRow
                    key={t.id}
                    t={t}
                    onClick={handleTicketSelect}
                    isSelected={selectedTicket?.id === t.id}
                  />
                ))}
                {visibleCount < filteredTickets.length && (
                  <div className="p-4 flex justify-center bg-slate-50 border-t border-industrial-border">
                    <button
                      onClick={handleLoadMore}
                      className="px-4 py-2 text-sm font-bold rounded border border-industrial-border hover:bg-white"
                    >
                      Tải thêm ({filteredTickets.length - visibleCount} còn lại)
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-industrial-muted italic">
                Không tìm thấy dữ liệu
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
