import { WeighTicket, Customer, Vehicle, Product, TicketStatus } from '../types';

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cus_1', name: 'Công ty TNHH ABC' },
  { id: 'cus_2', name: 'Công ty TNHH XYZ' },
  { id: 'cus_3', name: 'Công ty TNHH 123' },
];

export const MOCK_VEHICLES: Vehicle[] = [
  { id: 'veh_1', plateNumber: 'BKS001', lastDriverName: 'Nguyễn Văn A' },
  { id: 'veh_2', plateNumber: 'BKS002', lastDriverName: 'Trần Văn B' },
  { id: 'veh_3', plateNumber: 'BKS003', lastDriverName: 'Lê Văn C' },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 'prod_1', name: 'Cát' },
  { id: 'prod_2', name: 'Đá' },
  { id: 'prod_3', name: 'Gạch' },
  { id: 'prod_4', name: 'Xi măng' },
];

export const MOCK_TICKETS: WeighTicket[] = [
  {
    id: '2024-01-15T10:30:00.000Z',
    ticketNo: 'PL123456',
    vehicle: MOCK_VEHICLES[0],
    customer: MOCK_CUSTOMERS[0],
    product: MOCK_PRODUCTS[0],
    driverName: 'Nguyễn Văn A',
    operatorName: 'Admin User',
    grossWeight: 15000,
    tareWeight: 5000,
    netWeight: 10000,
    weighInTime: new Date('2024-01-15T10:30:00'),
    weighOutTime: new Date('2024-01-15T10:45:00'),
    status: TicketStatus.COMPLETED,
    isSigned: true,
    signedAt: new Date('2024-01-15T10:45:00'),
    signedBy: 'Admin User',
  },
  {
    id: '2024-01-15T11:00:00.000Z',
    ticketNo: 'PC123457',
    vehicle: MOCK_VEHICLES[1],
    customer: MOCK_CUSTOMERS[1],
    product: MOCK_PRODUCTS[1],
    driverName: 'Trần Văn B',
    operatorName: 'Admin User',
    grossWeight: 12000,
    tareWeight: 0,
    netWeight: 0,
    weighInTime: new Date('2024-01-15T11:00:00'),
    status: TicketStatus.PENDING_SECOND_WEIGH,
    isSigned: false,
  },
];


