import React, { useState, useCallback, useMemo } from 'react';
import { PlusIcon, EditIcon, TrashIcon, UserIcon, SearchIcon } from '../common/icons';
import { Driver } from '../../types';

interface DriverManagementScreenProps {
  drivers: Driver[];
  onAddDriver: (driver: Omit<Driver, 'id'>) => Driver;
  onUpdateDriver: (driver: Driver) => void;
  onDeleteDriver: (id: string) => void;
}

const DriverManagementScreen: React.FC<DriverManagementScreenProps> = ({
  drivers = [],
  onAddDriver,
  onUpdateDriver,
  onDeleteDriver,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const filteredDrivers = useMemo(() => {
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.phone && d.phone.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [drivers, searchTerm]);

  const paginatedDrivers = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredDrivers.slice(start, start + pageSize);
  }, [filteredDrivers, currentPage]);

  const totalPages = Math.ceil(filteredDrivers.length / pageSize);

  const handleAddClick = useCallback(() => {
    setEditingDriver(null);
    setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((driver: Driver) => {
    setEditingDriver(driver);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingDriver(null);
  }, []);

  const handleSaveDriver = useCallback(
    (formData: any) => {
      if (editingDriver) {
        onUpdateDriver({ ...editingDriver, ...formData });
      } else {
        onAddDriver(formData);
      }
      handleCloseModal();
    },
    [editingDriver, onAddDriver, onUpdateDriver, handleCloseModal]
  );

  const handleDeleteDriver = useCallback(
    (id: string) => {
      if (window.confirm('Bạn có chắc chắn muốn xóa tài xế này?')) {
        onDeleteDriver(id);
      }
    },
    [onDeleteDriver]
  );

  const isLicenseExpiringSoon = (expireDate?: Date) => {
    if (!expireDate) return false;
    const today = new Date();
    const daysUntilExpire = Math.floor(
      (new Date(expireDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpire <= 30 && daysUntilExpire >= 0;
  };

  const isLicenseExpired = (expireDate?: Date) => {
    if (!expireDate) return false;
    return new Date(expireDate) < new Date();
  };

  return (
    <div className="h-full flex flex-col bg-industrial-bg p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center gap-3 mb-4 md:mb-0">
          <UserIcon className="w-8 h-8 text-brand-primary" />
          <h1 className="text-2xl font-bold text-brand-primary">Quản lý Tài xế</h1>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Thêm tài xế
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-industrial-muted" />
          <input
            type="text"
            placeholder="Tìm kiếm tên, CMND, điện thoại..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-x-auto overflow-y-auto bg-white rounded-lg shadow-sm border border-industrial-border">
        {paginatedDrivers.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-industrial-muted">
            {filteredDrivers.length === 0 ? 'Không có tài xế nào' : 'Không có dữ liệu'}
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-industrial-border sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Tên</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">CMND/CCCD</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Điện thoại</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Bằng lái</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Hạn</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Chuyến</th>
                <th className="px-4 py-3 text-center font-semibold text-brand-secondary">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDrivers.map((driver) => (
                <tr key={driver.id} className="border-b border-industrial-border hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-brand-primary">{driver.name}</td>
                  <td className="px-4 py-3 text-brand-secondary">{driver.idNumber}</td>
                  <td className="px-4 py-3 text-brand-secondary">{driver.phone || '-'}</td>
                  <td className="px-4 py-3 text-brand-secondary">{driver.licenseType || '-'}</td>
                  <td className="px-4 py-3">
                    {driver.licenseExpireDate ? (
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          isLicenseExpired(driver.licenseExpireDate)
                            ? 'bg-red-100 text-red-700'
                            : isLicenseExpiringSoon(driver.licenseExpireDate)
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {new Date(driver.licenseExpireDate).toLocaleDateString('vi-VN')}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-secondary">{driver.totalTrips || 0}</td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button
                      onClick={() => handleEditClick(driver)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDriver(driver.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 border border-industrial-border rounded-lg disabled:opacity-50 hover:bg-slate-50"
          >
            Trước
          </button>
          <span className="px-3 py-1 text-sm text-brand-secondary">
            Trang {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="px-3 py-1 border border-industrial-border rounded-lg disabled:opacity-50 hover:bg-slate-50"
          >
            Tiếp
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <DriverFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveDriver}
          editingDriver={editingDriver}
        />
      )}
    </div>
  );
};

interface DriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingDriver: Driver | null;
}

const DriverFormModal: React.FC<DriverFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDriver,
}) => {
  const [formData, setFormData] = useState<any>({
    name: '',
    idNumber: '',
    phone: '',
    address: '',
    licenseNumber: '',
    licenseExpireDate: '',
    licenseType: '',
    notes: '',
  });

  React.useEffect(() => {
    if (editingDriver) {
      setFormData({
        ...editingDriver,
        licenseExpireDate: editingDriver.licenseExpireDate
          ? new Date(editingDriver.licenseExpireDate).toISOString().split('T')[0]
          : '',
      });
    } else {
      setFormData({
        name: '',
        idNumber: '',
        phone: '',
        address: '',
        licenseNumber: '',
        licenseExpireDate: '',
        licenseType: '',
        notes: '',
      });
    }
  }, [editingDriver, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên tài xế');
      return;
    }
    if (!formData.idNumber.trim()) {
      alert('Vui lòng nhập CMND/CCCD');
      return;
    }
    onSave(formData);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b bg-slate-50 rounded-t-lg sticky top-0">
            <h2 className="text-lg font-bold text-brand-primary">
              {editingDriver ? 'Chỉnh sửa Tài xế' : 'Thêm Tài xế mới'}
            </h2>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Tên tài xế *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Nhập tên tài xế"
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                CMND/CCCD *
              </label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                placeholder="Nhập CMND/CCCD"
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Điện thoại
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0912345678"
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Địa chỉ
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Địa chỉ tài xế"
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Số bằng lái
              </label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                placeholder="Số bằng lái"
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Hạng bằng
              </label>
              <select
                name="licenseType"
                value={formData.licenseType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">-- Chọn hạng bằng --</option>
                <option value="A">A</option>
                <option value="A1">A1</option>
                <option value="B">B</option>
                <option value="B1">B1</option>
                <option value="C">C</option>
                <option value="C1">C1</option>
                <option value="D">D</option>
                <option value="E">E</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Hạn bằng lái
              </label>
              <input
                type="date"
                name="licenseExpireDate"
                value={formData.licenseExpireDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Ghi chú
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Ghi chú thêm về tài xế"
                rows={3}
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              />
            </div>
          </div>

          <div className="p-4 border-t bg-slate-50 rounded-b-lg flex gap-3 justify-end sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-industrial-border rounded-lg text-brand-secondary hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
            >
              {editingDriver ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { DriverManagementScreen };

