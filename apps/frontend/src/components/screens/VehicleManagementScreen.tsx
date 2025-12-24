import React, { useState, useMemo } from 'react';
import { Vehicle } from '../../../types';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon, TruckIcon, UserIcon, XIcon, CheckIcon } from '../common/icons';

interface VehicleManagementScreenProps {
  vehicles: Vehicle[];
  onAddVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
}

export const VehicleManagementScreen: React.FC<VehicleManagementScreenProps> = ({
  vehicles,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('active');

  // Filter vehicles based on search term and active status
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch =
        vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vehicle.ownerName && vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (vehicle.defaultDriver && vehicle.defaultDriver.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        (activeTab === 'active' && vehicle.isActive) ||
        (activeTab === 'inactive' && !vehicle.isActive) ||
        activeTab === 'all';

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, searchTerm, activeTab]);

  const handleAddClick = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phương tiện này?')) {
      onDeleteVehicle(id);
    }
  };

  const handleSubmit = (formData: any) => {
    if (editingVehicle) {
      onUpdateVehicle({
        ...editingVehicle,
        ...formData,
        updatedAt: new Date().toISOString()
      });
    } else {
      const newVehicle = {
        ...formData,
        isActive: true,
        totalWeighs: 0,
        totalWeightTransported: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onAddVehicle(newVehicle);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý Phương tiện</h1>
        <button
          onClick={handleAddClick}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Thêm Phương tiện
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-1/3">
            <input
              type="text"
              placeholder="Tìm kiếm theo biển số, chủ xe..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}
            >
              Đang hoạt động
            </button>
            <button
              onClick={() => setActiveTab('inactive')}
              className={`px-4 py-2 rounded-lg ${activeTab === 'inactive' ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}
            >
              Ngừng hoạt động
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biển số</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chủ xe</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tài xế</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lần cân</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <TruckIcon className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="font-medium">{vehicle.plateNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{vehicle.ownerName || '-'}</div>
                    <div className="text-sm text-gray-500">{vehicle.ownerPhone || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{vehicle.defaultDriver || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{vehicle.defaultProduct || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{vehicle.totalWeighs || 0}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vehicle.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {vehicle.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditClick(vehicle)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      <EditIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(vehicle.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    Không tìm thấy phương tiện nào phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <VehicleFormModal
          vehicle={editingVehicle}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

// VehicleFormModal component
const VehicleFormModal: React.FC<{
  vehicle: Vehicle | null;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ vehicle, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    plateNumber: vehicle?.plateNumber || '',
    vehicleType: vehicle?.vehicleType || 'Xe tải',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    weightLimit: vehicle?.weightLimit || 0,
    defaultTare: vehicle?.defaultTare || 0,
    ownerName: vehicle?.ownerName || '',
    ownerPhone: vehicle?.ownerPhone || '',
    ownerAddress: vehicle?.ownerAddress || '',
    defaultDriver: vehicle?.defaultDriver || '',
    defaultCustomer: vehicle?.defaultCustomer || '',
    defaultProduct: vehicle?.defaultProduct || '',
    lastMaintenanceDate: vehicle?.lastMaintenanceDate ?
      new Date(vehicle.lastMaintenanceDate).toISOString().split('T')[0] : '',
    nextMaintenanceDate: vehicle?.nextMaintenanceDate ?
      new Date(vehicle.nextMaintenanceDate).toISOString().split('T')[0] : '',
    maintenanceNotes: vehicle?.maintenanceNotes || '',
    notes: vehicle?.notes || '',
    isActive: vehicle?.isActive ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">
              {vehicle ? 'Chỉnh sửa Phương tiện' : 'Thêm Phương tiện Mới'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Thông tin cơ bản */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Thông tin cơ bản</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biển số *</label>
                  <input
                    type="text"
                    name="plateNumber"
                    value={formData.plateNumber}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại xe</label>
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Xe tải">Xe tải</option>
                      <option value="Xe ben">Xe ben</option>
                      <option value="Xe container">Xe container</option>
                      <option value="Xe đầu kéo">Xe đầu kéo</option>
                      <option value="Xe khác">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hãng xe</label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mẫu xe</label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Năm sản xuất</label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tải trọng tối đa (kg)</label>
                    <input
                      type="number"
                      name="weightLimit"
                      value={formData.weightLimit}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tự trọng mặc định (kg)</label>
                    <input
                      type="number"
                      name="defaultTare"
                      value={formData.defaultTare}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Thông tin chủ sở hữu */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Thông tin chủ sở hữu</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên chủ xe</label>
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                    <input
                      type="text"
                      name="ownerAddress"
                      value={formData.ownerAddress}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Thông tin mặc định */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Thông tin mặc định</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tài xế thường xuyên</label>
                  <input
                    type="text"
                    name="defaultDriver"
                    value={formData.defaultDriver}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng thường xuyên</label>
                  <input
                    type="text"
                    name="defaultCustomer"
                    value={formData.defaultCustomer}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mặt hàng thường xuyên</label>
                  <input
                    type="text"
                    name="defaultProduct"
                    value={formData.defaultProduct}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Bảo dưỡng & Ghi chú */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Bảo dưỡng & Ghi chú</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lần bảo dưỡng cuối</label>
                    <input
                      type="date"
                      name="lastMaintenanceDate"
                      value={formData.lastMaintenanceDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hẹn bảo dưỡng tiếp</label>
                    <input
                      type="date"
                      name="nextMaintenanceDate"
                      value={formData.nextMaintenanceDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú bảo dưỡng</label>
                  <textarea
                    name="maintenanceNotes"
                    value={formData.maintenanceNotes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú khác</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                    Phương tiện đang hoạt động
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {vehicle ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VehicleManagementScreen;