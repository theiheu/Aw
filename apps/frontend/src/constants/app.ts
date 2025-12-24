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
  DRIVERS: 'weighDrivers',
  STATION_INFO: 'stationInfo',
} as const;

// Date Fields for LocalStorage Revival
export const DATE_FIELDS = {
  TICKETS: ['weighInTime', 'weighOutTime', 'signedAt'],
  CUSTOMERS: [],
  VEHICLES: [],
  PRODUCTS: [],
  DRIVERS: ['licenseExpireDate', 'lastTripTime'],
} as const;

// ID Prefixes
export const ID_PREFIXES = {
  CUSTOMER: 'cus_',
  VEHICLE: 'veh_',
  PRODUCT: 'prod_',
  DRIVER: 'drv_',
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
  DATA_HUB: 'dataHub',
  TICKET_SUBMISSION: 'ticketSubmission',
  VEHICLE_MANAGEMENT: 'vehicleManagement',
  DRIVER_MANAGEMENT: 'driverManagement',
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
  // Use WebSocket over HTTP for browsers; default to server host:9001
  MQTT_BROKER_URL:
    (import.meta as any)?.env?.VITE_MQTT_BROKER_URL ||
    ((typeof window !== 'undefined') ? `ws://${window.location.hostname}:9001` : 'ws://localhost:9001'),
  // Use relative path so Nginx in web container can proxy to backend (prod)
  // In dev, Vite proxy will map '/api' to http://localhost:4000
  BACKEND_URL:
    (import.meta as any)?.env?.VITE_BACKEND_URL || '/api',
  GEMINI_API_KEY: (import.meta as any)?.env?.VITE_GEMINI_API_KEY || '',
  REQUEST_TIMEOUT: 30000,                // 30 seconds timeout
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  BATCH_SIZE: 50,                        // Batch requests
} as const;

// UI Configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 500,
  TOAST_DURATION: 3000,
  MODAL_ANIMATION_DURATION: 200,
  INPUT_VALIDATION_DELAY: 500,
} as const;

// Pagination Configuration
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  ITEMS_PER_LOAD: 50,
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  TICKET_CACHE_TTL: 5 * 60 * 1000,      // 5 minutes
  CUSTOMER_CACHE_TTL: 10 * 60 * 1000,   // 10 minutes
  VEHICLE_CACHE_TTL: 10 * 60 * 1000,    // 10 minutes
  ENABLE_COMPRESSION: true,
} as const;

// LocalStorage Optimization
export const STORAGE_CONFIG = {
  MAX_TICKETS_STORED: 10000,
  MAX_CUSTOMERS_STORED: 5000,
  CLEANUP_THRESHOLD: 0.9,               // Clean at 90% quota
  ENABLE_COMPRESSION: true,
} as const;

// Validation Rules
export const VALIDATION = {
  MIN_WEIGHT: 0,
  MAX_WEIGHT: 999999,
  PLATE_NUMBER_PATTERN: /^[A-Z0-9]{1,10}$/i,
  PHONE_PATTERN: /^[0-9\-\+\s()]+$/,
  ENABLE_PATTERN_CACHE: true,
} as const;

// Security Configuration
export const SECURITY_CONFIG = {
  ENABLE_CORS: true,
  ENABLE_CSP: true,
  ENABLE_RATE_LIMITING: true,
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60000,             // 1 minute
} as const;

// Analytics Configuration
export const ANALYTICS_CONFIG = {
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_ERROR_TRACKING: true,
  SAMPLE_RATE: 0.1,                     // 10% sampling
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
  PAGINATION,
  CACHE_CONFIG,
  STORAGE_CONFIG,
  VALIDATION,
  SECURITY_CONFIG,
  ANALYTICS_CONFIG,
} as const;

