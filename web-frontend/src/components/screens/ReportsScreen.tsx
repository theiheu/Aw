import React, { useMemo, useState, useEffect } from 'react';
import { WeighTicket, StationInfo, TicketStatus, Customer, Product } from '../../types';
import {
  CheckCircleIcon,
  FilterIcon,
  HourglassIcon,
  ListIcon,
  PrinterIcon,
  TruckIcon,
} from '../common/icons';
import { UI_CONFIG, PAGINATION } from '../../constants/app';

// A re-usable card for summary stats
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subText?: string;
}> = ({ title, value, icon, color, subText }) => (
  <div className="bg-white p-5 rounded-xl border border-industrial-border shadow-industrial flex items-start transition-transform hover:-translate-y-1 duration-200">
    <div className={`p-3 rounded-lg ${color} mr-4 text-white shadow-md`}>{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-industrial-muted uppercase tracking-wider mb-1">
        {title}
      </p>
      <p className="text-2xl font-extrabold text-industrial-text tracking-tight">{value}</p>
      {subText && <p className="text-[10px] text-industrial-muted mt-1">{subText}</p>}
    </div>
  </div>
);

// Status Badge Component
const StatusBadge: React.FC<{ status: TicketStatus; isSigned: boolean }> = React.memo(
  ({ status, isSigned }) => {
    const styles = useMemo(() => {
      if (isSigned)
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          label: 'Đã ký số',
        };
      switch (status) {
        case TicketStatus.COMPLETED:
          return {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            border: 'border-blue-200',
            label: 'Hoàn thành',
          };
        case TicketStatus.PENDING_SECOND_WEIGH:
          return {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
            label: 'Chờ cân 2',
          };
        case TicketStatus.SINGLE_WEIGH:
          return {
            bg: 'bg-slate-100',
            text: 'text-slate-700',
            border: 'border-slate-200',
            label: 'Cân 1 lần',
          };
        default:
          return {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            border: 'border-gray-200',
            label: '---',
          };
      }
    }, [status, isSigned]);

    return (
      <span
        className={`inline-flex items-center py-1 px-2.5 rounded text-[10px] font-bold uppercase tracking-wide border ${styles.bg} ${styles.text} ${styles.border}`}
      >
        {styles.label}
      </span>
    );
  }
);

// Simple bar chart component
const SimpleBarChart: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 0), [data]);
  return (
    <div className="bg-white p-6 rounded-xl shadow-industrial border border-industrial-border h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-industrial-text text-sm uppercase tracking-wider">
          Sản lượng 7 ngày
        </h3>
        <span className="text-[10px] font-bold text-industrial-muted bg-slate-100 px-2 py-1 rounded border border-slate-200">
          TỔNG KL HÀNG
        </span>
      </div>
      <div className="flex justify-around items-end h-40 border-b border-industrial-border pb-2">
        {data.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center flex-1 px-1 group relative">
            {/* Tooltip */}
            <div className="absolute -top-8 bg-industrial-text text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-mono">
              {value.toLocaleString('vi-VN')} KG
            </div>
            <div
              className="w-full max-w-[30px] bg-brand-primary rounded-t-sm opacity-90 hover:opacity-100 transition-all duration-300"
              style={{ height: `${maxValue > 0 ? Math.max((value / maxValue) * 100, 4) : 0}%` }}
            ></div>
            <div className="text-[10px] text-industrial-muted mt-3 font-bold uppercase">
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Fix: Moved FilterControls outside
const FilterControls: React.FC<{
  filters: any;
  handleFilterChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  resetFilters: () => void;
  customers: Customer[];
  products: Product[];
}> = ({ filters, handleFilterChange, resetFilters, customers, products }) => (
  <div className="pt-4 border-t border-industrial-border mt-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      <div className="lg:col-span-1">
        <label className="block text-[10px] font-bold text-industrial-muted uppercase mb-1">
          Khách hàng
        </label>
        <select
          name="customerId"
          value={filters.customerId}
          onChange={handleFilterChange}
          className="w-full p-2 bg-white border border-industrial-border rounded text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
        >
          <option value="">Tất cả</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="lg:col-span-1">
        <label className="block text-[10px] font-bold text-industrial-muted uppercase mb-1">
          Loại hàng
        </label>
        <select
          name="productId"
          value={filters.productId}
          onChange={handleFilterChange}
          className="w-full p-2 bg-white border border-industrial-border rounded text-sm focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
        >
          <option value="">Tất cả</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
    <div className="mt-4 flex justify-end">
      <button
        onClick={resetFilters}
        className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand-danger bg-red-50 rounded hover:bg-red-100 border border-red-200"
      >
        Xóa bộ lọc
      </button>
    </div>
  </div>
);

export const ReportsScreen: React.FC<{
  tickets: WeighTicket[];
  stationInfo: StationInfo;
  customers: Customer[];
  products: Product[];
  currentUser?: { name: string; role: string };
}> = ({ tickets, stationInfo, customers, products, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    status: '',
    customerId: '',
    productId: '',
  });

  const [visibleCount, setVisibleCount] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearchTerm(searchTerm), UI_CONFIG.DEBOUNCE_DELAY);
    return () => clearTimeout(h);
  }, [searchTerm]);

  useEffect(() => {
    setVisibleCount(PAGINATION.DEFAULT_PAGE_SIZE);
  }, [debouncedSearchTerm, filters.dateStart, filters.dateEnd, filters.status, filters.customerId, filters.productId]);

  const isToday = (someDate: Date) => {
    const today = new Date();
    return (
      someDate.getDate() === today.getDate() &&
      someDate.getMonth() === today.getMonth() &&
      someDate.getFullYear() === today.getFullYear()
    );
  };

  // Filter tickets: if not admin, only show user's own tickets
  const visibleTickets = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return tickets;
    }
    // For non-admin users, only show their own tickets
    return tickets.filter((t) => t.createdBy === currentUser?.name || !t.createdBy);
  }, [tickets, currentUser]);

  const summaryStats = useMemo(() => {
    const todayTickets = visibleTickets.filter((t) => isToday(new Date(t.weighInTime)));
    const totalNetWeightToday = todayTickets.reduce((sum, t) => sum + t.netWeight, 0);
    const pendingCount = tickets.filter(
      (t) => t.status === TicketStatus.PENDING_SECOND_WEIGH
    ).length;
    const completedCount = visibleTickets.filter(
      (t) => t.status === TicketStatus.COMPLETED || t.status === TicketStatus.SINGLE_WEIGH
    ).length;

    return {
      ticketsToday: todayTickets.length,
      netWeightToday: (totalNetWeightToday / 1000).toFixed(2) + ' Tấn',
      pending: pendingCount,
      completed: completedCount,
    };
  }, [visibleTickets]);

  const chartData = useMemo(() => {
    const last7Days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dayTickets = visibleTickets.filter(
        (t) => new Date(t.weighInTime).setHours(0, 0, 0, 0) === d.getTime()
      );
      const totalWeight = dayTickets.reduce((sum, t) => sum + t.netWeight, 0);

      const label = i === 0 ? 'Nay' : d.toLocaleDateString('vi-VN', { weekday: 'short' });
      last7Days.push({ label, value: totalWeight });
    }
    return last7Days;
  }, [visibleTickets]);

  const filteredTickets = useMemo(() => {
    return visibleTickets
      .filter((ticket) => {
        // Search filter
        const lowerCaseSearchTerm = debouncedSearchTerm.toLowerCase();
        const searchMatch =
          !debouncedSearchTerm ||
          ticket.ticketNo.toLowerCase().includes(lowerCaseSearchTerm) ||
          ticket.vehicle.plateNumber.toLowerCase().includes(lowerCaseSearchTerm) ||
          ticket.customer.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          ticket.product.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          ticket.driverName.toLowerCase().includes(lowerCaseSearchTerm);
        if (!searchMatch) return false;

        // Date filter
        const weighInDate = new Date(ticket.weighInTime);
        weighInDate.setHours(0, 0, 0, 0);

        if (filters.dateStart) {
          if (weighInDate < new Date(new Date(filters.dateStart).setHours(0, 0, 0, 0)))
            return false;
        }
        if (filters.dateEnd) {
          if (weighInDate > new Date(new Date(filters.dateEnd).setHours(0, 0, 0, 0))) return false;
        }

        // Status filter
        if (filters.status && ticket.status !== filters.status) return false;

        // Customer filter
        if (filters.customerId && ticket.customer.id !== filters.customerId) return false;

        // Product filter
        if (filters.productId && ticket.product.id !== filters.productId) return false;

        return true;
      })
      .sort((a, b) => new Date(b.weighInTime).getTime() - new Date(a.weighInTime).getTime());
  }, [visibleTickets, debouncedSearchTerm, filters]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const resetFilters = () => {
    setFilters({ dateStart: '', dateEnd: '', status: '', customerId: '', productId: '' });
    setSearchTerm('');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + PAGINATION.ITEMS_PER_LOAD, filteredTickets.length));
  };

  const slicedTickets = filteredTickets.slice(0, visibleCount);

  return (
    <div
      className="bg-industrial-bg min-h-screen h-full flex flex-col overflow-hidden"
      id="reports-page"
    >
      <style>
        {`
                @media print {
                    body * { visibility: hidden; }
                    #printable-reports, #printable-reports * { visibility: visible; }
                    #printable-reports { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
                    .no-print { display: none !important; }
                    table { font-size: 10pt !important; border: 1px solid #000; width: 100%; }
                    th, td { border: 1px solid #ccc; padding: 5px; }
                    .print-header { display: block !important; text-align: center; margin-bottom: 2rem; }
                }
                `}
      </style>

      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-industrial-border flex justify-between items-center shrink-0 no-print">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-text uppercase tracking-tight">
            Báo cáo & Thống kê
          </h1>
          <p className="text-xs text-industrial-muted">Tổng quan hoạt động trạm cân</p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-industrial-text text-white px-4 py-2 rounded-lg flex items-center shadow hover:bg-black transition-colors text-sm font-bold uppercase tracking-wide"
        >
          <PrinterIcon className="w-4 h-4 mr-2" /> Xuất báo cáo
        </button>
      </header>

      <div className="flex-grow overflow-y-auto p-6 custom-scrollbar pb-24">
        <div id="printable-reports" className="max-w-7xl mx-auto space-y-6 pb-12">
          <div className="hidden print-header">
            <h1 className="text-2xl font-bold">{stationInfo.name}</h1>
            <h2 className="text-xl">BÁO CÁO LỊCH SỬ PHIẾU CÂN</h2>
            <p>Ngày in: {new Date().toLocaleDateString('vi-VN')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
            {/* Left Col: Stats */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                title="Phiếu hôm nay"
                value={summaryStats.ticketsToday}
                icon={<ListIcon className="w-5 h-5" />}
                color="bg-brand-primary"
              />
              <StatCard
                title="KL hàng hôm nay"
                value={summaryStats.netWeightToday}
                icon={<TruckIcon className="w-5 h-5" />}
                color="bg-brand-success"
              />
              <StatCard
                title="Chờ cân lần 2"
                value={summaryStats.pending}
                icon={<HourglassIcon className="w-5 h-5" />}
                color="bg-brand-accent"
              />
              <StatCard
                title="Hoàn thành"
                value={summaryStats.completed}
                icon={<CheckCircleIcon className="w-5 h-5" />}
                color="bg-indigo-500"
              />
            </div>
            {/* Right Col: Chart */}
            <div className="md:col-span-1 h-full">
              <SimpleBarChart data={chartData} />
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-xl shadow-industrial border border-industrial-border overflow-hidden">
            <div className="p-5 border-b border-industrial-border flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-50">
              <div>
                <h3 className="font-bold text-industrial-text text-sm uppercase tracking-wider">
                  Chi tiết phiếu cân
                </h3>
                <p className="text-[10px] text-industrial-muted font-bold mt-1">
                  HIỂN THỊ {slicedTickets.length} / {filteredTickets.length} KẾT QUẢ
                </p>
              </div>
              <div className="flex items-center gap-3 no-print">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-industrial-border rounded-lg w-full md:w-64 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  />
                  <div className="absolute left-3 top-2.5 text-industrial-muted">
                    <FilterIcon className="w-4 h-4" />
                  </div>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-lg border transition-all ${showFilters ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white text-industrial-muted border-industrial-border hover:border-brand-primary'}`}
                >
                  <FilterIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="px-5 pb-5 bg-slate-50 border-b border-industrial-border no-print">
                <FilterControls
                  filters={filters}
                  handleFilterChange={handleFilterChange}
                  resetFilters={resetFilters}
                  customers={customers}
                  products={products}
                />
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-industrial-text">
                <thead className="text-[10px] text-industrial-muted uppercase bg-slate-50 border-b border-industrial-border">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-extrabold tracking-wider">
                      Số phiếu
                    </th>
                    <th scope="col" className="px-6 py-3 font-extrabold tracking-wider">
                      Ngày cân
                    </th>
                    <th scope="col" className="px-6 py-3 font-extrabold tracking-wider">
                      Biển số
                    </th>
                    <th scope="col" className="px-6 py-3 font-extrabold tracking-wider">
                      Khách hàng & Hàng
                    </th>
                    <th scope="col" className="px-6 py-3 text-right font-extrabold tracking-wider">
                      KL Hàng (KG)
                    </th>
                    <th scope="col" className="px-6 py-3 font-extrabold tracking-wider">
                      Ghi chú
                    </th>
                    <th scope="col" className="px-6 py-3 font-extrabold tracking-wider">
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slicedTickets.map((t) => (
                    <tr key={t.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs font-bold text-industrial-text">
                        {t.ticketNo}
                      </td>
                      <td className="px-6 py-3 text-xs">
                        {new Date(t.weighInTime).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-6 py-3 font-bold">{t.vehicle.plateNumber}</td>
                      <td className="px-6 py-3">
                        <div className="font-semibold text-industrial-text text-xs">
                          {t.customer.name}
                        </div>
                        <div className="text-[10px] text-industrial-muted uppercase font-bold">
                          {t.product.name}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-mono font-bold text-industrial-text">
                        {t.netWeight > 0 ? t.netWeight.toLocaleString('vi-VN') : '-'}
                      </td>
                      <td
                        className="px-6 py-3 text-xs italic text-industrial-muted max-w-[150px] truncate"
                        title={t.notes}
                      >
                        {t.notes || ''}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={t.status} isSigned={t.isSigned} />
                      </td>
                    </tr>
                  ))}
                  {slicedTickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-industrial-muted italic">
                        Không tìm thấy dữ liệu phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};
