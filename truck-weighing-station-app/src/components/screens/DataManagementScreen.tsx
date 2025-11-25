import React, { useState, useEffect } from 'react';
import { Customer, Vehicle, Product, AppScreen } from '../types';
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  UserIcon,
  TruckIcon,
  PackageIcon,
} from '../common/icons';

type Entity = Customer | Vehicle | Product;
type EntityType = 'customer' | 'vehicle' | 'product';

interface DataManagementScreenProps {
  setActiveScreen: (screen: AppScreen) => void;
  customers: Customer[];
  vehicles: Vehicle[];
  products: Product[];
  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

const DataFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  entityType: EntityType;
  editingItem: Entity | null;
  customers: Customer[];
  products: Product[];
}> = ({ isOpen, onClose, onSave, entityType, editingItem, customers, products }) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (editingItem) {
      setFormData(editingItem);
    } else {
      if (entityType === 'customer' || entityType === 'product') setFormData({ name: '' });
      if (entityType === 'vehicle')
        setFormData({
          plateNumber: '',
          lastCustomerName: '',
          lastProductName: '',
          lastDriverName: '',
        });
    }
  }, [editingItem, entityType, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const getTitle = () => {
    const action = editingItem ? 'Chỉnh sửa' : 'Thêm mới';
    switch (entityType) {
      case 'customer':
        return `${action} Khách hàng`;
      case 'vehicle':
        return `${action} Phương tiện`;
      case 'product':
        return `${action} Hàng hóa`;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b bg-slate-50 rounded-t-lg">
            <h2 className="text-lg font-bold text-brand-primary">{getTitle()}</h2>
          </div>
          <div className="p-4 space-y-4">
            {entityType === 'customer' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Tên công ty / Khách hàng
                </label>
                <input
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder="VD: Công ty Xi măng Hà Tiên"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  required
                />
              </div>
            )}

            {entityType === 'product' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Tên hàng hoá
                </label>
                <input
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder="VD: Cát xây dựng"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  required
                />
              </div>
            )}

            {entityType === 'vehicle' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Biển số xe <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="plateNumber"
                    value={formData.plateNumber || ''}
                    onChange={handleChange}
                    placeholder="VD: 59C-123.45"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent font-bold"
                    required
                  />
                </div>
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <p className="text-xs font-semibold text-brand-primary mb-3 uppercase tracking-wide">
                    Thông tin mặc định (Tự động điền)
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Khách hàng thường xuyên
                      </label>
                      <select
                        name="lastCustomerName"
                        value={formData.lastCustomerName || ''}
                        onChange={handleChange}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-white"
                      >
                        <option value="">-- Chọn khách hàng --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Loại hàng thường chở
                      </label>
                      <select
                        name="lastProductName"
                        value={formData.lastProductName || ''}
                        onChange={handleChange}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent bg-white"
                      >
                        <option value="">-- Chọn hàng hoá --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Tài xế mặc định
                      </label>
                      <input
                        name="lastDriverName"
                        value={formData.lastDriverName || ''}
                        onChange={handleChange}
                        placeholder="Tên tài xế"
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="p-4 border-t flex justify-end space-x-3 bg-slate-50 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-bold text-white bg-brand-primary hover:bg-blue-700 rounded-lg shadow-md transition-colors"
            >
              Lưu thông tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DataManagementScreen: React.FC<DataManagementScreenProps> = (props) => {
  const [activeTab, setActiveTab] = useState<EntityType>('vehicle'); // Default to Vehicle tab for quick access
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Entity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenModal = (item: Entity | null = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setIsModalOpen(false);
  };

  const handleSave = (data: any) => {
    if (editingItem) {
      // Update
      if (activeTab === 'customer') props.onUpdateCustomer(data);
      if (activeTab === 'vehicle') props.onUpdateVehicle(data);
      if (activeTab === 'product') props.onUpdateProduct(data);
    } else {
      // Add
      if (activeTab === 'customer') props.onAddCustomer(data);
      if (activeTab === 'vehicle') props.onAddVehicle(data);
      if (activeTab === 'product') props.onAddProduct(data);
    }
    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá mục này không?')) {
      if (activeTab === 'customer') props.onDeleteCustomer(id);
      if (activeTab === 'vehicle') props.onDeleteVehicle(id);
      if (activeTab === 'product') props.onDeleteProduct(id);
    }
  };

  const tabConfig = {
    vehicle: {
      title: 'Xe & Mẫu cân',
      data: props.vehicles,
      icon: <TruckIcon className="w-5 h-5" />,
      mainField: 'plateNumber',
    },
    customer: {
      title: 'Khách hàng',
      data: props.customers,
      icon: <UserIcon className="w-5 h-5" />,
      mainField: 'name',
    },
    product: {
      title: 'Hàng hóa',
      data: props.products,
      icon: <PackageIcon className="w-5 h-5" />,
      mainField: 'name',
    },
  };

  const currentTab = tabConfig[activeTab];

  // Filter data
  const filteredData = currentTab.data.filter((item: any) =>
    item[currentTab.mainField].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-50 h-full flex flex-col overflow-hidden">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex items-center shrink-0 justify-between">
        <div className="flex items-center">
          {/* Only show back button if coming from somewhere specific, but now it's a main tab */}
          {/* <button onClick={() => props.setActiveScreen('settings')} className="p-2 rounded-full hover:bg-slate-200 mr-2 md:hidden">
                        <ChevronLeftIcon className="w-6 h-6 text-slate-700" />
                    </button> */}
          <div>
            <h1 className="text-xl font-extrabold text-brand-primary uppercase tracking-tight">
              Quản lý Dữ liệu
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Thiết lập danh mục xe, khách hàng và hàng hoá
            </p>
          </div>
        </div>
        <button
          onClick={() => handleOpenModal(null)}
          className="bg-brand-primary hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-sm transition-colors text-sm"
        >
          <PlusIcon className="w-5 h-5 mr-1" /> <span className="hidden sm:inline">Thêm mới</span>{' '}
          <span className="sm:hidden">Thêm</span>
        </button>
      </header>

      <div className="bg-white border-b border-slate-200 px-4 pt-2">
        <nav className="flex space-x-4 overflow-x-auto no-scrollbar">
          {(Object.keys(tabConfig) as EntityType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchTerm('');
              }}
              className={`flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-bold text-sm transition-colors ${
                activeTab === tab
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <span
                className={`mr-2 ${activeTab === tab ? 'text-brand-primary' : 'text-slate-400'}`}
              >
                {tabConfig[tab].icon}
              </span>
              {tabConfig[tab].title}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <input
          type="text"
          placeholder={`Tìm kiếm ${currentTab.title.toLowerCase()}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary shadow-sm"
        />
      </div>

      <main className="flex-grow overflow-y-auto custom-scrollbar p-4 pb-24">
        <div className="space-y-3">
          {filteredData.length > 0 ? (
            filteredData.map((item: any) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 gap-3"
              >
                <div className="flex items-start sm:items-center">
                  <div
                    className={`p-3 rounded-full mr-4 shrink-0 ${activeTab === 'vehicle' ? 'bg-amber-100 text-amber-600' : 'bg-blue-50 text-brand-primary'}`}
                  >
                    {currentTab.icon}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-base block">
                      {item[currentTab.mainField]}
                    </span>

                    {/* Show extra details for Vehicles */}
                    {activeTab === 'vehicle' && (
                      <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                        {item.lastCustomerName && (
                          <p>
                            KH:{' '}
                            <span className="font-medium text-slate-700">
                              {item.lastCustomerName}
                            </span>
                          </p>
                        )}
                        {item.lastProductName && (
                          <p>
                            Hàng:{' '}
                            <span className="font-medium text-slate-700">
                              {item.lastProductName}
                            </span>
                          </p>
                        )}
                        {item.lastDriverName && (
                          <p>
                            Tài xế:{' '}
                            <span className="font-medium text-slate-700">
                              {item.lastDriverName}
                            </span>
                          </p>
                        )}
                        {!item.lastCustomerName && !item.lastProductName && (
                          <span className="italic text-slate-400">Chưa có thông tin mẫu</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-50">
                  <button
                    onClick={() => handleOpenModal(item)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-xs font-bold flex items-center transition-colors"
                  >
                    <EditIcon className="w-4 h-4 mr-1" /> Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-lg text-xs font-bold flex items-center transition-colors"
                  >
                    <TrashIcon className="w-4 h-4 mr-1" /> Xoá
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="bg-slate-100 p-4 rounded-full mb-3">{currentTab.icon}</div>
              <p className="font-semibold">Không tìm thấy dữ liệu</p>
              <p className="text-sm mt-1">Nhấn nút &quot;Thêm mới&quot; để tạo dữ liệu.</p>
            </div>
          )}
        </div>
      </main>

      <DataFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        entityType={activeTab}
        editingItem={editingItem}
        customers={props.customers}
        products={props.products}
      />
    </div>
  );
};
