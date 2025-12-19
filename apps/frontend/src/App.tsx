import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { BottomNav, SideNav } from './components';
import ToastContainer from './components/common/ToastContainer';

// Code-split heavy screens
const WeighingScreen = lazy(() =>
  import('./components/screens/WeighingScreen').then((m) => ({ default: m.WeighingScreen }))
);
const ReportsScreen = lazy(() =>
  import('./components/screens/ReportsScreen').then((m) => ({ default: m.ReportsScreen }))
);
const SettingsScreen = lazy(() =>
  import('./components/screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen }))
);
const DataManagementScreen = lazy(() =>
  import('./components/screens/DataManagementScreen').then((m) => ({ default: m.DataManagementScreen }))
);
const TicketSubmissionScreen = lazy(() =>
  import('./components/screens/TicketSubmissionScreen').then((m) => ({ default: m.TicketSubmissionScreen }))
);
const PrintPreviewModal = lazy(() =>
  import('./components/modals/PrintPreviewModal').then((m) => ({ default: m.PrintPreviewModal }))
);
const VehicleManagementScreen = lazy(() =>
  import('./components/screens/VehicleManagementScreen').then((m) => ({ default: m.VehicleManagementScreen }))
);
const DriverManagementScreen = lazy(() =>
  import('./components/screens/DriverManagementScreen').then((m) => ({ default: m.DriverManagementScreen }))
);
import {
  WeighTicket,
  User,
  Customer,
  Vehicle,
  Product,
  TicketStatus,
  TicketSubmissionStatus,
  StationInfo,
  AppScreen,
  Driver,
} from './types';
import { MOCK_TICKETS, MOCK_CUSTOMERS, MOCK_VEHICLES, MOCK_PRODUCTS } from './data/mockData';
import { WebSocketProvider } from './contexts/WebSocketContext';
import {
  loadFromLocalStorage,
  loadObjectFromLocalStorage,
  saveToLocalStorage,
} from './utils/storage';
import {
  STORAGE_KEYS,
  DATE_FIELDS,
  DEFAULT_STATION_INFO,
  DEFAULT_USER,
  SCREENS,
  ID_PREFIXES,
  TICKET_TYPES,
} from './constants/app';

const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('main');

  const [currentUser] = useState<User>(DEFAULT_USER);

  // Detect user mode via URL (?mode=user) or by role (non-admin)
  const isUserMode = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    if (modeParam === 'user') return true;
    if (modeParam === 'admin') return false;
    return currentUser.role !== 'admin';
  }, [currentUser.role]);

  // Only allow certain screens in user mode
  const allowedScreensUser: AppScreen[] = ['main', 'ticketSubmission'];
  const safeSetActiveScreen = React.useCallback(
    (screen: AppScreen) => {
      if (isUserMode && !allowedScreensUser.includes(screen)) {
        setActiveScreen('main');
        return;
      }
      setActiveScreen(screen);
    },
    [isUserMode]
  );

  // Guard against direct navigation to disallowed screens in user mode
  useEffect(() => {
    if (isUserMode && !allowedScreensUser.includes(activeScreen)) {
      setActiveScreen('main');
    }
  }, [isUserMode, activeScreen])

  // --- State Management for all data types ---
  const [tickets, setTickets] = useState<WeighTicket[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.TICKETS, MOCK_TICKETS, DATE_FIELDS.TICKETS)
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.CUSTOMERS, MOCK_CUSTOMERS, DATE_FIELDS.CUSTOMERS)
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.VEHICLES, MOCK_VEHICLES, DATE_FIELDS.VEHICLES)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS, DATE_FIELDS.PRODUCTS)
  );
  const [drivers, setDrivers] = useState<Driver[]>(() =>
    loadFromLocalStorage(STORAGE_KEYS.DRIVERS, [], DATE_FIELDS.DRIVERS)
  );
  const [stationInfo, setStationInfo] = useState<StationInfo>(() =>
    loadObjectFromLocalStorage(STORAGE_KEYS.STATION_INFO, DEFAULT_STATION_INFO)
  );

  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.TICKETS, tickets);
  }, [tickets]);
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.CUSTOMERS, customers);
  }, [customers]);
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.VEHICLES, vehicles);
  }, [vehicles]);
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.PRODUCTS, products);
  }, [products]);
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.DRIVERS, drivers);
  }, [drivers]);
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.STATION_INFO, stationInfo);
  }, [stationInfo]);

  const [ticketForPreview, setTicketForPreview] = useState<WeighTicket | null>(null);

  // --- CRUD for Tickets ---
  const addTicket = useCallback((newTicket: WeighTicket) => {
    setTickets((prevTickets) => [newTicket, ...prevTickets]);
  }, []);

  const updateTicket = useCallback((updatedTicket: WeighTicket) => {
    setTickets((prevTickets) =>
      prevTickets.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket))
    );
    // If the updated ticket is currently being previewed, update the preview state as well
    setTicketForPreview((prev) => (prev && prev.id === updatedTicket.id ? updatedTicket : prev));
  }, []);

  // --- CRUD for Customers ---
  const addCustomer = useCallback((customer: Omit<Customer, 'id'>) => {
    const newCustomer = { ...customer, id: `${ID_PREFIXES.CUSTOMER}${Date.now()}` };
    setCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  }, []);
  const updateCustomer = useCallback((updated: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);
  const deleteCustomer = useCallback((id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // --- CRUD for Vehicles ---
  const addVehicle = useCallback((vehicle: Omit<Vehicle, 'id'>) => {
    const newVehicle = { ...vehicle, id: `${ID_PREFIXES.VEHICLE}${Date.now()}` };
    setVehicles((prev) => [newVehicle, ...prev]);
    return newVehicle;
  }, []);
  const updateVehicle = useCallback((updated: Vehicle) => {
    setVehicles((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  }, []);
  const deleteVehicle = useCallback((id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  // --- CRUD for Products ---
  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: `${ID_PREFIXES.PRODUCT}${Date.now()}` };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  }, []);
  const updateProduct = useCallback((updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);
  const deleteProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // --- CRUD for Drivers ---
  const addDriver = useCallback((driver: Omit<Driver, 'id'>) => {
    const newDriver: Driver = {
      ...driver,
      id: `${ID_PREFIXES.DRIVER}${Date.now()}`,
      totalTrips: (driver as any).totalTrips ?? 0,
      totalWeightTransported: (driver as any).totalWeightTransported ?? 0,
    };
    setDrivers((prev) => [newDriver, ...prev]);
    return newDriver;
  }, []);
  const updateDriver = useCallback((updated: Driver) => {
    setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  }, []);
  const deleteDriver = useCallback((id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // --- Handler for Station Info ---
  const updateStationInfo = useCallback((newInfo: StationInfo) => {
    setStationInfo(newInfo);
  }, []);

  // --- Business Logic for Weighing ---
  const processWeighing = useCallback(
    (data: {
      plateNumber: string;
      customerName: string;
      productName: string;
      driverName: string;
      operatorName: string;
      weight: number;
      type: 'single' | 'first';
      notes?: string;
    }) => {
      // Allow completely empty form: do not inject placeholders like 'N/A'
      const plate = (data.plateNumber || '').trim();
      const customerName = (data.customerName || '').trim();
      const productName = (data.productName || '').trim();
      const driverName = (data.driverName || '').trim();
      const operatorName = (data.operatorName || '').trim();

      // 1. Vehicle: find/create only if plate is provided; else use ephemeral blank vehicle
      let vehicle: Vehicle | undefined = undefined;
      if (plate) {
        vehicle = vehicles.find((v) => v.plateNumber.toLowerCase() === plate.toLowerCase());
      if (!vehicle) {
          vehicle = addVehicle({ plateNumber: plate });
      }
        // Update vehicle memory only with provided fields
        const updatedVehicle: Vehicle = { ...vehicle };
        if (driverName) updatedVehicle.lastDriverName = driverName;
        if (customerName) updatedVehicle.lastCustomerName = customerName;
        if (productName) updatedVehicle.lastProductName = productName;
      updateVehicle(updatedVehicle);
        vehicle = updatedVehicle;
      } else {
        vehicle = { id: `${ID_PREFIXES.VEHICLE}${Date.now()}`, plateNumber: '' };
      }

      // 2. Customer: find/create only if provided; else ephemeral
      let customer: Customer | undefined = undefined;
      if (customerName) {
        customer = customers.find((c) => c.name.toLowerCase() === customerName.toLowerCase());
        if (!customer) customer = addCustomer({ name: customerName });
      } else {
        customer = { id: `${ID_PREFIXES.CUSTOMER}${Date.now()}`, name: '' };
      }

      // 3. Product: find/create only if provided; else ephemeral
      let product: Product | undefined = undefined;
      if (productName) {
        product = products.find((p) => p.name.toLowerCase() === productName.toLowerCase());
        if (!product) product = addProduct({ name: productName });
      } else {
        product = { id: `${ID_PREFIXES.PRODUCT}${Date.now()}`, name: '' };
      }

      // 4. Create Ticket
      const commonTicketData = {
        id: new Date().toISOString(),
        vehicle: vehicle!,
        customer: customer!,
        product: product!,
        driverName,
        operatorName,
        weighInTime: new Date(),
        isSigned: false,
        notes: data.notes,
      };

      if (data.type === TICKET_TYPES.SINGLE) {
        const newTicket: WeighTicket = {
          ...commonTicketData,
          ticketNo: `${ID_PREFIXES.TICKET_SINGLE}${Date.now().toString().slice(-6)}`,
          grossWeight: data.weight,
          tareWeight: 0, // Or could be vehicle.defaultTare if implemented
          netWeight: data.weight,
          status: TicketStatus.SINGLE_WEIGH,
        };
        addTicket(newTicket);
      } else {
        // 'first' weigh
        const newTicket: WeighTicket = {
          ...commonTicketData,
          ticketNo: `${ID_PREFIXES.TICKET_FIRST}${Date.now().toString().slice(-6)}`,
          grossWeight: data.weight,
          tareWeight: 0,
          netWeight: 0,
          status: TicketStatus.PENDING_SECOND_WEIGH,
        };
        addTicket(newTicket);
      }
    },
    [vehicles, customers, products, addVehicle, addCustomer, addProduct, addTicket, updateVehicle]
  );

  const showPrintPreview = useCallback((ticket: WeighTicket) => {
    setTicketForPreview(ticket);
  }, []);

  const renderScreen = () => {
    switch (activeScreen) {
      case SCREENS.MAIN:
        return (
          <WeighingScreen
            processWeighing={processWeighing}
            updateTicket={updateTicket}
            vehicles={vehicles}
            customers={customers}
            products={products}
            tickets={tickets}
            onPrintRequest={showPrintPreview}
            currentUser={currentUser}
            stationInfo={stationInfo}
          />
        );
      case SCREENS.REPORTS:
        return (
          <ReportsScreen
            tickets={tickets}
            stationInfo={stationInfo}
            customers={customers}
            products={products}
            currentUser={currentUser}
          />
        );
      case SCREENS.TICKET_SUBMISSION:
        return (
          <TicketSubmissionScreen
            tickets={tickets}
            currentUser={currentUser}
            stationInfo={stationInfo}
            vehicles={vehicles}
            customers={customers}
            products={products}
            onAddTicket={addTicket}
            onUpdateTicket={updateTicket}
            onSubmitTicket={(ticketId) => {
              const ticket = tickets.find((t) => t.id === ticketId);
              if (ticket) {
                updateTicket({
                  ...ticket,
                  submissionStatus: TicketSubmissionStatus.SUBMITTED,
                });
              }
            }}
            onPrintRequest={showPrintPreview}
          />
        );
      case SCREENS.SETTINGS:
        return (
          <SettingsScreen
            setActiveScreen={setActiveScreen}
            stationInfo={stationInfo}
            onUpdateStationInfo={updateStationInfo}
          />
        );
      case SCREENS.DATA_MANAGEMENT:
        return (
          <DataManagementScreen
            setActiveScreen={setActiveScreen}
            customers={customers}
            vehicles={vehicles}
            products={products}
            onAddCustomer={addCustomer}
            onUpdateCustomer={updateCustomer}
            onDeleteCustomer={deleteCustomer}
            onAddVehicle={addVehicle}
            onUpdateVehicle={updateVehicle}
            onDeleteVehicle={deleteVehicle}
            onAddProduct={addProduct}
            onUpdateProduct={updateProduct}
            onDeleteProduct={deleteProduct}
          />
        );
      case SCREENS.VEHICLE_MANAGEMENT:
        return (
          <VehicleManagementScreen
            vehicles={vehicles}
            onAddVehicle={addVehicle}
            onUpdateVehicle={updateVehicle}
            onDeleteVehicle={deleteVehicle}
          />
        );
      case SCREENS.DRIVER_MANAGEMENT:
        return (
          <DriverManagementScreen
            drivers={drivers}
            onAddDriver={addDriver}
            onUpdateDriver={updateDriver}
            onDeleteDriver={deleteDriver}
          />
        );
      default:
        return (
          <WeighingScreen
            processWeighing={processWeighing}
            updateTicket={updateTicket}
            vehicles={vehicles}
            customers={customers}
            products={products}
            tickets={tickets}
            onPrintRequest={showPrintPreview}
            currentUser={currentUser}
            stationInfo={stationInfo}
          />
        );
    }
  };

  // Prefetch lazy screens when browser is idle to improve navigation speed
  useEffect(() => {
    const idleCb: any = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 500));
    const cancelIdle: any = (window as any).cancelIdleCallback || clearTimeout;
    const id = idleCb(() => {
      // Hint bundler to prefetch chunks
      import(/* webpackPrefetch: true */ './components/screens/ReportsScreen');
      import(/* webpackPrefetch: true */ './components/screens/SettingsScreen');
      import(/* webpackPrefetch: true */ './components/screens/DataManagementScreen');
      import(/* webpackPrefetch: true */ './components/screens/TicketSubmissionScreen');
      import(/* webpackPrefetch: true */ './components/modals/PrintPreviewModal');
    });
    return () => cancelIdle(id);
  }, []);

  return (
    <WebSocketProvider>
      <div className="h-screen w-screen font-sans text-brand-secondary bg-industrial-bg flex flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <SideNav activeScreen={activeScreen} setActiveScreen={safeSetActiveScreen} isUserMode={isUserMode} />
          <main className="flex-1 relative h-full overflow-hidden md:pl-64 flex flex-col">
            <div className="flex-1 h-full overflow-hidden">
              <Suspense fallback={<div className="p-6 text-sm text-industrial-muted">Đang tải...</div>}>
                {renderScreen()}
              </Suspense>
            </div>
          </main>
        </div>
        <BottomNav activeScreen={activeScreen} setActiveScreen={safeSetActiveScreen} isUserMode={isUserMode} />
        {ticketForPreview && (
          <Suspense fallback={<div className="p-4 text-sm text-industrial-muted">Đang tải bản xem trước...</div>}>
            <PrintPreviewModal
              ticket={ticketForPreview}
              onClose={() => setTicketForPreview(null)}
              stationInfo={stationInfo}
              onUpdateTicket={updateTicket}
            />
          </Suspense>
        )}
      </div>
      <ToastContainer />
    </WebSocketProvider>
  );
};

export default App;
