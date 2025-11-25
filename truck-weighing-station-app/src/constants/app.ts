/**
 * Application Constants
 * Centralized configuration and magic strings
 */

// App Metadata
export const APP_NAME = 'Truck Weighing Station';
export const APP_VERSION = '1.0.0';

// LocalStorage Keys
export const STORAGE_KEYS = {
  TICKETS: 'weighTickets',
  CUSTOMERS: 'weighCustomers',
  VEHICLES: 'weighVehicles',
  PRODUCTS: 'weighProducts',
  STATION_INFO: 'stationInfo',
} as const;

// Date Fields for LocalStorage Revival
export const DATE_FIELDS = {
  TICKETS: ['weighInTime', 'weighOutTime', 'signedAt'],
  CUSTOMERS: [],
  VEHICLES: [],
  PRODUCTS: [],
} as const;

// ID Prefixes
export const ID_PREFIXES = {
  CUSTOMER: 'cus_',
  VEHICLE: 'veh_',
  PRODUCT: 'prod_',
  TICKET_SINGLE: 'PL',
  TICKET_FIRST: 'PC',
} as const;

// Ticket Types
export const TICKET_TYPES = {
  SINGLE: 'single',
  FIRST: 'first',
} as const;

// Screen Names
export const SCREENS = {
  MAIN: 'main',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  DATA_MANAGEMENT: 'dataManagement',
  TICKET_SUBMISSION: 'ticketSubmission',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  STAFF: 'staff',
} as const;

// Default Station Info
export const DEFAULT_STATION_INFO = {
  name: 'TRẠM CÂN XE TẢI ABC',
  address: '123 Đường XYZ, Phường An Lạc, Quận Bình Tân, TP.HCM',
  phone: '0123.456.789',
  defaultOperatorName: 'Admin User',
} as const;

// Default User
export const DEFAULT_USER = {
  name: 'Admin User',
  role: 'admin',
} as const;

// API Configuration
export const API_CONFIG = {
  MQTT_BROKER_URL: process.env.REACT_APP_MQTT_BROKER_URL || 'mqtt://localhost:1883',
  BACKEND_URL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
} as const;

// UI Configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
  MODAL_ANIMATION_DURATION: 200,
} as const;

// Validation Rules
export const VALIDATION = {
  MIN_WEIGHT: 0,
  MAX_WEIGHT: 999999,
  PLATE_NUMBER_PATTERN: /^[A-Z0-9]{1,10}$/i,
  PHONE_PATTERN: /^[0-9\-\+\s()]+$/,
} as const;

// Export all constants as a single object for convenience
export const APP_CONSTANTS = {
  APP_NAME,
  APP_VERSION,
  STORAGE_KEYS,
  DATE_FIELDS,
  ID_PREFIXES,
  TICKET_TYPES,
  SCREENS,
  USER_ROLES,
  DEFAULT_STATION_INFO,
  DEFAULT_USER,
  API_CONFIG,
  UI_CONFIG,
  VALIDATION,
} as const;

