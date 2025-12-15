export enum TicketStatus {
  PENDING_SECOND_WEIGH = 'Chờ cân lần 2',
  COMPLETED = 'Hoàn thành',
  CANCELLED = 'Đã huỷ',
  SINGLE_WEIGH = 'Cân 1 lần',
  PENDING_APPROVAL = 'Chờ xác nhận',
}

export enum TicketSubmissionStatus {
  DRAFT = 'Nháp',
  SUBMITTED = 'Đã gửi',
  APPROVED = 'Đã duyệt',
  REJECTED = 'Bị từ chối',
}

export enum SignatureStatus {
  NOT_SIGNED = 'Chưa ký',
  SIGNED = 'Đã ký số',
}

export type AppScreen = 'main' | 'reports' | 'settings' | 'dataManagement' | 'ticketSubmission' | 'vehicleManagement' | 'driverManagement';

export interface User {
  name: string;
  role: 'admin' | 'staff';
}

export interface WeighTicket {
  id: string;
  ticketNo: string;
  vehicle: Vehicle;
  customer: Customer;
  product: Product;
  driverName: string;
  operatorName?: string; // Added operator name field
  notes?: string;

  grossWeight: number;
  tareWeight: number;
  netWeight: number;

  weighInTime: Date;
  weighOutTime?: Date;

  status: TicketStatus;
  submissionStatus?: TicketSubmissionStatus; // New: track submission status

  isSigned: boolean;
  signedAt?: Date;
  signedBy?: string;
  signatureHash?: string;
  signatureImage?: string;

  // User tracking
  createdBy?: string; // User ID who created the ticket
  createdByName?: string; // User name who created the ticket
  approvedBy?: string; // Admin ID who approved
  approvedAt?: Date;
  rejectionReason?: string; // If rejected, why
}

export interface Customer {
  id: string;
  name: string;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  defaultTare?: number;
  // New fields for "Memory" feature (Auto-fill)
  lastDriverName?: string;
  lastCustomerName?: string;
  lastProductName?: string;
}

export interface Product {
  id: string;
  name: string;
}

export interface StationInfo {
  name: string;
  address: string;
  phone: string;
  defaultOperatorName?: string; // New field for default operator name
}

export interface Driver {
  id: string;
  name: string;
  idNumber: string;
  phone?: string;
  address?: string;
  licenseNumber?: string;
  licenseExpireDate?: Date | string;
  licenseType?: string;
  totalTrips: number;
  totalWeightTransported: number;
  lastTripTime?: Date | string;
  notes?: string;
}
