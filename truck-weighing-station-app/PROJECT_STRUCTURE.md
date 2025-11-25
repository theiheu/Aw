# Project Structure Reference

Hướng dẫn nhanh về cấu trúc dự án mới.

---

## 📁 Cấu Trúc Thư Mục

```
truck-weighing-station-app/
│
├── src/                          # Source code
│   ├── components/               # React components
│   │   ├── screens/             # Full-page screens
│   │   │   ├── WeighingScreen.tsx
│   │   │   ├── DataManagementScreen.tsx
│   │   │   ├── ReportsScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── modals/              # Modal dialogs
│   │   │   ├── PrintPreviewModal.tsx
│   │   │   └── SignatureModal.tsx
│   │   ├── common/              # Shared components
│   │   │   ├── BottomNav.tsx
│   │   │   ├── SideNav.tsx
│   │   │   ├── TicketCard.tsx
│   │   │   ├── PrintableTicket.tsx
│   │   │   ├── icons.tsx
│   │   │   └── index.ts         # Component exports
│   │   └── index.ts             # Central exports
│   │
│   ├── contexts/                # React Context
│   │   ├── MqttContext.tsx
│   │   └── WebSocketContext.tsx
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useMqtt.ts
│   │   ├── useWebSocket.ts
│   │   ├── useSimulatedWeight.ts
│   │   └── useWebSocketWeight.ts
│   │
│   ├── utils/                   # Utility functions
│   │   ├── storage.ts           # LocalStorage helpers
│   │   ├── formatters.ts        # Data formatting
│   │   ├── validators.ts        # Validation functions
│   │   └── index.ts             # Utils exports
│   │
│   ├── constants/               # Constants & config
│   │   └── app.ts               # App-wide constants
│   │
│   ├── data/                    # Data & mocks
│   │   ├── mockData.ts
│   │   ├── mosquitto/           # MQTT data
│   │   └── postgres/            # PostgreSQL data
│   │
│   ├── types.ts                 # TypeScript types
│   ├── App.tsx                  # Root component
│   └── index.tsx                # Entry point
│
├── config/                      # Configuration
│   ├── backend.env              # Backend config
│   ├── web.env                  # Frontend config
│   ├── mosquitto.conf           # MQTT config
│   └── passwd                   # MQTT passwords
│
├── public/                      # Static files
│
├── index.html                   # HTML entry point
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript config
├── tsconfig.app.json            # App TypeScript config
├── package.json                 # Dependencies
├── .prettierrc                  # Prettier config
├── .gitignore                   # Git ignore rules
├── .eslintrc.json               # ESLint config
├── .editorconfig                # Editor config
│
├── README.md                    # Project overview
├── DEVELOPMENT.md               # Development guide
├── CLEANUP_SUMMARY.md           # Cleanup summary
├── MIGRATION_CHECKLIST.md       # Migration checklist
├── PROJECT_STRUCTURE.md         # This file
├── QUICK_START.sh               # Quick start script
├── LICENSE                      # MIT License
│
└── docker-compose.yml           # Docker Compose config
```

---

## 🎯 Folder Purpose

### `src/components/`
**Mục đích:** Chứa tất cả React components

**Subfolder:**
- `screens/` - Các màn hình chính (WeighingScreen, ReportsScreen, etc.)
- `modals/` - Modal dialogs (PrintPreviewModal, SignatureModal)
- `common/` - Shared components (BottomNav, SideNav, TicketCard, etc.)

**Cách sử dụng:**
```typescript
import { WeighingScreen, TicketCard } from '@/components';
```

---

### `src/contexts/`
**Mục đích:** React Context cho global state

**Files:**
- `MqttContext.tsx` - MQTT connection state
- `WebSocketContext.tsx` - WebSocket connection state

**Cách sử dụng:**
```typescript
import { MqttProvider } from '@/contexts/MqttContext';
import { useMqtt } from '@/hooks/useMqtt';
```

---

### `src/hooks/`
**Mục đích:** Custom React hooks

**Files:**
- `useMqtt.ts` - MQTT connection hook
- `useWebSocket.ts` - WebSocket connection hook
- `useSimulatedWeight.ts` - Simulated weight data hook
- `useWebSocketWeight.ts` - WebSocket weight data hook

**Cách sử dụng:**
```typescript
import { useMqtt } from '@/hooks/useMqtt';

const { connect, disconnect, publish } = useMqtt();
```

---

### `src/utils/`
**Mục đích:** Utility functions

**Files:**
- `storage.ts` - LocalStorage helpers
  - `loadFromLocalStorage()`
  - `saveToLocalStorage()`
  - `removeFromLocalStorage()`
  - `clearLocalStorage()`

- `formatters.ts` - Data formatting
  - `formatDate()`, `formatDateTime()`, `formatTime()`
  - `formatWeight()`, `formatCurrency()`
  - `formatPhoneNumber()`, `formatPlateNumber()`
  - `truncateText()`, `formatFileSize()`

- `validators.ts` - Validation functions
  - `isValidWeight()`, `isValidPlateNumber()`
  - `isValidPhoneNumber()`, `isValidEmail()`
  - `isRequired()`, `isMinLength()`, `isMaxLength()`
  - `isNotFutureDate()`, `isValidDateRange()`
  - `isValidUrl()`, `isValidJson()`
  - `hasRequiredFields()`

**Cách sử dụng:**
```typescript
import { formatDate, isValidWeight } from '@/utils';

const dateStr = formatDate(new Date());
if (isValidWeight(weight)) { /* ... */ }
```

---

### `src/constants/`
**Mục đích:** App-wide constants

**Files:**
- `app.ts` - Tất cả constants
  - `STORAGE_KEYS` - LocalStorage keys
  - `DATE_FIELDS` - Date field names
  - `ID_PREFIXES` - ID prefixes
  - `TICKET_TYPES` - Ticket type values
  - `SCREENS` - Screen names
  - `USER_ROLES` - User role values
  - `DEFAULT_STATION_INFO` - Default values
  - `DEFAULT_USER` - Default user
  - `API_CONFIG` - API configuration
  - `UI_CONFIG` - UI configuration
  - `VALIDATION` - Validation rules

**Cách sử dụng:**
```typescript
import { STORAGE_KEYS, SCREENS, ID_PREFIXES } from '@/constants/app';

const tickets = loadFromLocalStorage(STORAGE_KEYS.TICKETS, []);
if (activeScreen === SCREENS.MAIN) { /* ... */ }
const customerId = `${ID_PREFIXES.CUSTOMER}${Date.now()}`;
```

---

### `src/data/`
**Mục đích:** Mock data và database volumes

**Files:**
- `mockData.ts` - Mock data cho development
- `mosquitto/` - MQTT data volume
- `postgres/` - PostgreSQL data volume

**Cách sử dụng:**
```typescript
import { MOCK_TICKETS } from '@/data/mockData';

const tickets = loadFromLocalStorage(STORAGE_KEYS.TICKETS, MOCK_TICKETS);
```

---

### `src/types.ts`
**Mục đích:** TypeScript type definitions

**Exports:**
- `WeighTicket` - Ticket data type
- `Customer` - Customer data type
- `Vehicle` - Vehicle data type
- `Product` - Product data type
- `User` - User data type
- `StationInfo` - Station information type
- `AppScreen` - Screen type
- `TicketStatus` - Ticket status enum
- `SignatureStatus` - Signature status enum

**Cách sử dụng:**
```typescript
import { WeighTicket, Customer, Vehicle } from '@/types';

const ticket: WeighTicket = { /* ... */ };
const customer: Customer = { /* ... */ };
```

---

### `src/App.tsx`
**Mục đích:** Root component

**Chứa:**
- State management cho toàn app
- CRUD operations
- Screen routing
- Provider setup

---

### `src/index.tsx`
**Mục đích:** Entry point

**Chứa:**
- React app initialization
- Root component rendering

---

## 🔄 Import Patterns

### ✅ Recommended

```typescript
// From components index
import { WeighingScreen, TicketCard } from '@/components';

// From utils
import { formatDate, isValidWeight } from '@/utils';

// From constants
import { STORAGE_KEYS, SCREENS } from '@/constants/app';

// From types
import { WeighTicket, Customer } from '@/types';

// From hooks
import { useMqtt } from '@/hooks/useMqtt';

// From contexts
import { MqttProvider } from '@/contexts/MqttContext';
```

### ❌ Not Recommended

```typescript
// Direct imports (use index instead)
import { WeighingScreen } from '@/components/screens/WeighingScreen';

// Magic strings (use constants)
const key = 'weighTickets';

// Duplicate functions (use utils)
function formatDate(date: Date) { /* ... */ }
```

---

## 📝 Adding New Files

### Adding a New Component

```
1. Create file in appropriate folder:
   src/components/screens/MyScreen.tsx
   src/components/modals/MyModal.tsx
   src/components/common/MyComponent.tsx

2. Export from src/components/index.ts:
   export { MyComponent } from './common/MyComponent';

3. Use in other components:
   import { MyComponent } from '@/components';
```

### Adding a New Utility Function

```
1. Add to appropriate file in src/utils/:
   src/utils/formatters.ts
   src/utils/validators.ts
   src/utils/storage.ts

2. Export from src/utils/index.ts:
   export * from './formatters';

3. Use in components:
   import { myFunction } from '@/utils';
```

### Adding a New Constant

```
1. Add to src/constants/app.ts:
   export const MY_CONSTANT = 'value';

2. Use in components:
   import { MY_CONSTANT } from '@/constants/app';
```

### Adding a New Hook

```
1. Create file in src/hooks/:
   src/hooks/useMyHook.ts

2. Use in components:
   import { useMyHook } from '@/hooks/useMyHook';
```

---

## 🎯 Quick Reference

| Task | Location | Import |
|------|----------|--------|
| Create screen | `src/components/screens/` | `@/components` |
| Create modal | `src/components/modals/` | `@/components` |
| Create shared component | `src/components/common/` | `@/components` |
| Create custom hook | `src/hooks/` | `@/hooks/useMyHook` |
| Create utility function | `src/utils/` | `@/utils` |
| Add constant | `src/constants/app.ts` | `@/constants/app` |
| Add type | `src/types.ts` | `@/types` |
| Add mock data | `src/data/mockData.ts` | `@/data/mockData` |

---

## 📚 Related Documentation

- **README.md** - Project overview and setup
- **DEVELOPMENT.md** - Detailed development guide
- **CLEANUP_SUMMARY.md** - Summary of changes
- **MIGRATION_CHECKLIST.md** - Migration verification

---

**Happy coding! 🚀**

