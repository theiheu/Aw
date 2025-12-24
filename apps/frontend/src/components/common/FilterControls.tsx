import React from 'react';
import { TicketStatus } from '../../types';

export const FilterControls: React.FC<{
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

