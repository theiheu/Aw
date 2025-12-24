/**
 * Components Index
 * Central export point for all components
 */

// Screens
// NOTE: Không export statically các screen đang được lazy-load trong App.tsx
// để tránh Vite warning: module vừa dynamic import vừa static import.
// export { WeighingScreen } from './screens/WeighingScreen'; // lazy-load in App.tsx
export { DataManagementScreen } from './screens/DataManagementScreen';
export { VehicleManagementScreen } from './screens/VehicleManagementScreen';
export { DriverManagementScreen } from './screens/DriverManagementScreen';

// Modals
export { PrintPreviewModal } from './modals/PrintPreviewModal';
export { SignatureModal } from './modals/SignatureModal';

// Common Components
export { BottomNav } from './common/BottomNav';
export { SideNav } from './common/SideNav';
export { TicketCard } from './common/TicketCard';
export { PrintableTicket } from './common/PrintableTicket';
export * from './common/icons';

