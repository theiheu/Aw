import React, { useEffect, useState } from 'react';
import { TruckIcon, UserIcon, PackageIcon, XIcon } from '../common/icons';

// Local, simple input for modal (avoid importing WeighingScreen's InputField)
const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  listId?: string;
  options?: string[];
  icon?: React.ReactNode;
  disabled?: boolean;
}> = ({ label, value, onChange, placeholder, listId, options, icon, disabled }) => {
  return (
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          list={listId}
          className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-industrial-border rounded-md text-industrial-text text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
        />
        {!!options && options.length > 0 && listId && (
          <datalist id={listId}>
            {options.slice(0, 200).map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        )}
      </div>
    </div>
  );
};

export type QuickAddVehicleData = {
  plateNumber: string;
  defaultCustomer: string;
  defaultProduct: string;
};

export const QuickAddVehicleModal: React.FC<{
  open: boolean;
  initialPlateNumber: string;
  customerOptions: string[];
  productOptions: string[];
  onClose: () => void;
  onSubmit: (data: QuickAddVehicleData) => void;
}> = ({ open, initialPlateNumber, customerOptions, productOptions, onClose, onSubmit }) => {
  const [plateNumber, setPlateNumber] = useState(initialPlateNumber || '');
  const [defaultCustomer, setDefaultCustomer] = useState('');
  const [defaultProduct, setDefaultProduct] = useState('');

  useEffect(() => {
    if (open) {
      setPlateNumber(initialPlateNumber || '');
      setDefaultCustomer('');
      setDefaultProduct('');
    }
  }, [open, initialPlateNumber]);

  if (!open) return null;

  const handleSubmit = () => {
    const p = plateNumber.trim();
    if (!p) return alert('Vui lòng nhập biển số xe');
    if (!defaultCustomer.trim()) return alert('Vui lòng chọn/nhập khách hàng');
    if (!defaultProduct.trim()) return alert('Vui lòng chọn/nhập hàng hoá');

    onSubmit({
      plateNumber: p,
      defaultCustomer: defaultCustomer.trim(),
      defaultProduct: defaultProduct.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-xl border border-industrial-border">
        <div className="p-4 border-b border-industrial-border flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold uppercase tracking-wider text-industrial-text">
              Tạo xe mới
            </div>
            <div className="text-xs text-industrial-muted">
              Xe chưa có trong hệ thống. Tạo nhanh để lần sau chỉ cần nhập biển số.
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-700">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <Field
            label="Biển số xe"
            value={plateNumber}
            onChange={setPlateNumber}
            placeholder="VD: 61E-04032"
            icon={<TruckIcon className="w-4 h-4" />}
          />

          <Field
            label="Khách hàng (mặc định)"
            value={defaultCustomer}
            onChange={setDefaultCustomer}
            placeholder="VD: Anh Út"
            listId="quickadd-customer-options"
            options={customerOptions}
            icon={<UserIcon className="w-4 h-4" />}
          />

          <Field
            label="Hàng hoá (mặc định)"
            value={defaultProduct}
            onChange={setDefaultProduct}
            placeholder="VD: Phân tro"
            listId="quickadd-product-options"
            options={productOptions}
            icon={<PackageIcon className="w-4 h-4" />}
          />
        </div>

        <div className="p-4 border-t border-industrial-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold rounded border border-industrial-border bg-white hover:bg-slate-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-bold rounded bg-brand-primary text-white hover:bg-blue-700"
          >
            Tạo xe
          </button>
        </div>
      </div>
    </div>
  );
};

