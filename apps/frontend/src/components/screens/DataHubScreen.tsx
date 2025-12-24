import React, { useMemo, useState } from 'react';
import { AppScreen, Customer, Driver, Product, Vehicle } from '../../types';
import { DriverManagementScreen } from './DriverManagementScreen';
import { VehicleManagementScreen } from './VehicleManagementScreen';
import { DataManagementScreen } from './DataManagementScreen';

type TabKey = 'vehicles' | 'drivers' | 'data';

interface DataHubScreenProps {
  setActiveScreen: (screen: AppScreen) => void;

  customers: Customer[];
  vehicles: Vehicle[];
  products: Product[];
  drivers: Driver[];

  onAddCustomer: (customer: Omit<Customer, 'id'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;

  onAddVehicle: (vehicle: any) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;

  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;

  onAddDriver: (driver: Omit<Driver, 'id'>) => Driver;
  onUpdateDriver: (driver: Driver) => void;
  onDeleteDriver: (id: string) => void;
}

export const DataHubScreen: React.FC<DataHubScreenProps> = (props) => {
  const [tab, setTab] = useState<TabKey>('vehicles');

  const tabs = useMemo(
    () => [
      { key: 'vehicles' as const, label: 'Xe' },
      { key: 'drivers' as const, label: 'Tài xế' },
      { key: 'data' as const, label: 'Danh mục' },
    ],
    []
  );

  const TabBtn = ({ k, label }: { k: TabKey; label: string }) => (
    <button
      onClick={() => setTab(k)}
      className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
        tab === k
          ? 'bg-brand-primary text-white border-brand-primary'
          : 'bg-white text-industrial-muted border-industrial-border hover:border-brand-primary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-industrial-text">Quản lý dữ liệu</h1>
          <p className="text-sm text-industrial-muted">
            Gộp quản lý Xe / Tài xế / Danh mục để tránh trùng lặp
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <TabBtn key={t.key} k={t.key} label={t.label} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-industrial-border shadow-sm">
        <div className="p-3">
          {tab === 'vehicles' && (
            <VehicleManagementScreen
              vehicles={props.vehicles}
              onAddVehicle={props.onAddVehicle}
              onUpdateVehicle={props.onUpdateVehicle}
              onDeleteVehicle={props.onDeleteVehicle}
            />
          )}

          {tab === 'drivers' && (
            <DriverManagementScreen
              drivers={props.drivers}
              onAddDriver={props.onAddDriver}
              onUpdateDriver={props.onUpdateDriver}
              onDeleteDriver={props.onDeleteDriver}
            />
          )}

          {tab === 'data' && (
            <DataManagementScreen
              setActiveScreen={props.setActiveScreen}
              customers={props.customers}
              products={props.products}
              onAddCustomer={props.onAddCustomer}
              onUpdateCustomer={props.onUpdateCustomer}
              onDeleteCustomer={props.onDeleteCustomer}
              onAddProduct={props.onAddProduct}
              onUpdateProduct={props.onUpdateProduct}
              onDeleteProduct={props.onDeleteProduct}
            />
          )}
        </div>
      </div>
    </div>
  );
};

