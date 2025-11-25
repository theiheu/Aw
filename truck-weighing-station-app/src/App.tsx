import React, { useState, useCallback, useEffect } from 'react';
import {
  WeighingScreen,
  SettingsScreen,
  BottomNav,
  PrintPreviewModal,
  DataManagementScreen,
  SideNav,
  ReportsScreen,
  TicketSubmissionScreen,
} from './components';
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
} from './types';
import { MOCK_TICKETS, MOCK_CUSTOMERS, MOCK_VEHICLES, MOCK_PRODUCTS } from './data/mockData';
import { MqttProvider } from './contexts/MqttContext';
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
      // 1. Find or create Vehicle
      let vehicle = vehicles.find(
        (v) => v.plateNumber.toLowerCase() === data.plateNumber.toLowerCase()
      );
      if (!vehicle) {
        vehicle = addVehicle({ plateNumber: data.plateNumber });
      }

      // --- UPDATE VEHICLE MEMORY ---
      // Save the current transaction details to the vehicle for auto-fill next time
      const updatedVehicle: Vehicle = {
        ...vehicle,
        lastDriverName: data.driverName,
        lastCustomerName: data.customerName,
        lastProductName: data.productName,
      };
      updateVehicle(updatedVehicle);
      // Use the updated vehicle object for ticket creation
      vehicle = updatedVehicle;

      // 2. Find or create Customer
      let customer = customers.find(
        (c) => c.name.toLowerCase() === data.customerName.toLowerCase()
      );
      if (!customer) {
        customer = addCustomer({ name: data.customerName });
      }

      // 3. Find or create Product
      let product = products.find((p) => p.name.toLowerCase() === data.productName.toLowerCase());
      if (!product) {
        product = addProduct({ name: data.productName });
      }

      // 4. Create Ticket
      const commonTicketData = {
        id: new Date().toISOString(),
        vehicle,
        customer,
        product,
        driverName: data.driverName,
        operatorName: data.operatorName, // Save Operator Name
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

  return (
    <MqttProvider>
      <div className="h-screen w-screen font-sans text-brand-secondary bg-industrial-bg flex flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <SideNav activeScreen={activeScreen} setActiveScreen={safeSetActiveScreen} isUserMode={isUserMode} />
          <main className="flex-1 relative h-full overflow-hidden md:pl-64 flex flex-col">
            <div className="flex-1 h-full overflow-hidden">{renderScreen()}</div>
          </main>
        </div>
        <BottomNav activeScreen={activeScreen} setActiveScreen={safeSetActiveScreen} isUserMode={isUserMode} />
        {ticketForPreview && (
          <PrintPreviewModal
            ticket={ticketForPreview}
            onClose={() => setTicketForPreview(null)}
            stationInfo={stationInfo}
            onUpdateTicket={updateTicket}
          />
        )}
      </div>
    </MqttProvider>
  );
};

export default App;
