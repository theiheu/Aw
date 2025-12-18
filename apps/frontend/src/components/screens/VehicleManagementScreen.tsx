import React, { useState, useCallback, useMemo } from 'react';
import { Vehicle } from '../../types';
import { PlusIcon, EditIcon, TrashIcon, TruckIcon, SearchIcon } from '../common/icons';

interface VehicleManagementScreenProps {
  vehicles: Vehicle[];
  onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => Vehicle;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
}

const VehicleManagementScreen: React.FC<VehicleManagementScreenProps> = ({
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(
      (v) =>
        v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.ownerName && v.ownerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.vehicleType && v.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [vehicles, searchTerm]);

  const paginatedVehicles = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, currentPage]);

  const totalPages = Math.ceil(filteredVehicles.length / pageSize);

  const handleAddClick = useCallback(() => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  }, []);

  const handleSaveVehicle = useCallback(
    (formData: any) => {
      if (editingVehicle) {
        onUpdateVehicle({ ...editingVehicle, ...formData });
      } else {
        onAddVehicle(formData);
      }
      handleCloseModal();
    },
    [editingVehicle, onAddVehicle, onUpdateVehicle, handleCloseModal]
  );

  const handleDeleteVehicle = useCallback(
    (id: string) => {
      if (window.confirm('Bạn có chắc chắn muốn xóa phương tiện này?')) {
        onDeleteVehicle(id);
      }
    },
    [onDeleteVehicle]
  );

  return (
    <div className="h-full flex flex-col bg-industrial-bg p-4 md:p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center gap-3 mb-4 md:mb-0">
          <TruckIcon className="w-8 h-8 text-brand-primary" />
          <h1 className="text-2xl font-bold text-brand-primary">Quản lý Phương tiện</h1>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Thêm phương tiện
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-industrial-muted" />
          <input
            type="text"
            placeholder="Tìm kiếm biển số, chủ sở hữu, loại xe..."
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
        {paginatedVehicles.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-industrial-muted">
            {filteredVehicles.length === 0 ? 'Không có phương tiện nào' : 'Không có dữ liệu'}
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 border-b border-industrial-border sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Biển số</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Loại xe</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Chủ sở hữu</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Điện thoại</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Giới hạn (kg)</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-secondary">Lần cân</th>
                <th className="px-4 py-3 text-center font-semibold text-brand-secondary">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b border-industrial-border hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-brand-primary">{vehicle.plateNumber}</td>
                  <td className="px-4 py-3 text-brand-secondary">{vehicle.vehicleType || '-'}</td>
                  <td className="px-4 py-3 text-brand-secondary">{vehicle.ownerName || '-'}</td>
                  <td className="px-4 py-3 text-brand-secondary">{vehicle.ownerPhone || '-'}</td>
                  <td className="px-4 py-3 text-brand-secondary">
                    {vehicle.maxWeightLimit ? vehicle.maxWeightLimit.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-brand-secondary">{vehicle.totalWeighCount || 0}</td>
                  <td className="px-4 py-3 flex justify-center gap-2">
                    <button
                      onClick={() => handleEditClick(vehicle)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Chỉnh sửa"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(vehicle.id)}
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
        <VehicleFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveVehicle}
          editingVehicle={editingVehicle}
        />
      )}
    </div>
  );
};

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingVehicle: Vehicle | null;
}

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingVehicle,
}) => {
  const [formData, setFormData] = useState<any>({
    plateNumber: '',
    vehicleType: '',
    ownerName: '',
    ownerPhone: '',
    ownerAddress: '',
    maxWeightLimit: '',
  });

  React.useEffect(() => {
    if (editingVehicle) {
      setFormData(editingVehicle);
    } else {
      setFormData({
        plateNumber: '',
        vehicleType: '',
        ownerName: '',
        ownerPhone: '',
        ownerAddress: '',
        maxWeightLimit: '',
      });
    }
  }, [editingVehicle, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: name === 'maxWeightLimit' ? (value ? parseFloat(value) : '') : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.plateNumber.trim()) {
      alert('Vui lòng nhập biển số');
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
              {editingVehicle ? 'Chỉnh sửa Phương tiện' : 'Thêm Phương tiện mới'}
            </h2>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Biển số *
              </label>
              <input
                type="text"
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleChange}
                placeholder="VD: 29A-12345"
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Loại xe
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">-- Chọn loại xe --</option>
                <option value="Xe tải">Xe tải</option>
                <option value="Xe ben">Xe ben</option>
                <option value="Xe đầu kéo">Xe đầu kéo</option>
                <option value="Xe khác">Xe khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Chủ sở hữu
              </label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                placeholder="Tên chủ sở hữu"
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Điện thoại
              </label>
              <input
                type="tel"
                name="ownerPhone"
                value={formData.ownerPhone}
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
                name="ownerAddress"
                value={formData.ownerAddress}
                onChange={handleChange}
                placeholder="Địa chỉ chủ sở hữu"
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Giới hạn trọng lượng (kg)
              </label>
              <input
                type="number"
                name="maxWeightLimit"
                value={formData.maxWeightLimit}
                onChange={handleChange}
                placeholder="VD: 10000"
                className="w-full px-3 py-2 border border-industrial-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
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
              {editingVehicle ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { VehicleManagementScreen };

