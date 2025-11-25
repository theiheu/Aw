# Development Guide

Hướng dẫn phát triển cho Truck Weighing Station App.

## [object Object]ục lục

- [Setup Development Environment](#setup-development-environment)
- [Project Structure](#project-structure)
- [Code Standards](#code-standards)
- [Component Development](#component-development)
- [State Management](#state-management)
- [Utilities & Helpers](#utilities--helpers)
- [Testing & Validation](#testing--validation)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Setup Development Environment

### Prerequisites
- Node.js >= 18.17.0
- npm >= 9.0.0

### Initial Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd truck-weighing-station-app

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# http://localhost:5173
```

### Environment Variables

Create `.env.local` in project root:

```env
VITE_API_URL=http://localhost:4000
VITE_MQTT_BROKER=mqtt://localhost:1883
GEMINI_API_KEY=your_api_key_here
```

---

## Project Structure

```
src/
├── components/              # React components
│   ├── screens/            # Full-page screens
│   │   ├── WeighingScreen.tsx
│   │   ├── ReportsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── DataManagementScreen.tsx
│   ├── modals/             # Modal dialogs
│   │   ├── PrintPreviewModal.tsx
│   │   └── SignatureModal.tsx
│   ├── common/             # Shared components
│   │   ├── BottomNav.tsx
│   │   ├── SideNav.tsx
│   │   ├── TicketCard.tsx
│   │   ├── PrintableTicket.tsx
│   │   ├── icons.tsx
│   │   └── index.ts
│   └── index.ts            # Component exports
├── contexts/               # React Context
│   ├── MqttContext.tsx
│   └── WebSocketContext.tsx
├── hooks/                  # Custom hooks
│   ├── useMqtt.ts
│   ├── useWebSocket.ts
│   ├── useSimulatedWeight.ts
│   └── useWebSocketWeight.ts
├── utils/                  # Utility functions
│   ├── storage.ts          # LocalStorage helpers
│   ├── formatters.ts       # Data formatting
│   ├── validators.ts       # Validation functions
│   └── index.ts            # Utils exports
├── constants/              # Constants & config
│   └── app.ts              # App constants
├── data/                   # Data & mocks
│   ├── mockData.ts
│   ├── mosquitto/
│   └── postgres/
├── types.ts                # TypeScript types
├── App.tsx                 # Root component
└── index.tsx               # Entry point
```

---

## Code Standards

### TypeScript

- ✅ Always use TypeScript for type safety
- ✅ Define interfaces for props and state
- ✅ Use strict mode in tsconfig.json
- ✅ Avoid `any` type - use `unknown` or specific types

```typescript
// ✅ Good
interface ComponentProps {
  title: string;
  onAction: (id: string) => void;
  items?: Item[];
}

// ❌ Avoid
interface ComponentProps {
  title: any;
  onAction: any;
}
```

### React Components

- ✅ Use functional components with hooks
- ✅ Memoize expensive components
- ✅ Use `useCallback` for event handlers
- ✅ Use `useMemo` for expensive computations
- ✅ Extract sub-components when needed

```typescript
// ✅ Good
interface MyComponentProps {
  title: string;
  items: Item[];
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, items }) => {
  const handleClick = useCallback((id: string) => {
    // Handle click
  }, []);

  return (
    <div>
      <h1>{title}</h1>
      <ItemList items={items} onItemClick={handleClick} />
    </div>
  );
};

// ❌ Avoid
export const MyComponent = ({ title, items }) => {
  const handleClick = (id) => {
    // Handle click
  };

  return (
    <div>
      <h1>{title}</h1>
      {items.map((item) => (
        <div key={item.id} onClick={() => handleClick(item.id)}>
          {item.name}
        </div>
      ))}
    </div>
  );
};
```

### Naming Conventions

- **Components**: PascalCase (e.g., `WeighingScreen`, `TicketCard`)
- **Functions**: camelCase (e.g., `formatDate`, `validateWeight`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_STATION_INFO`)
- **Files**: Match component name or use camelCase for utilities

### Code Style

- Use Prettier for formatting
- Use ESLint for code quality
- Max line length: 100 characters
- 2 spaces for indentation
- Single quotes for strings

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Fix linting errors
npm run lint:fix
```

---

## Component Development

### Creating a New Component

1. **Create component file** in appropriate folder:

```typescript
// src/components/common/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onAction}>Action</button>
    </div>
  );
};
```

2. **Export from index.ts**:

```typescript
// src/components/index.ts
export { MyComponent } from './common/MyComponent';
```

3. **Use in other components**:

```typescript
import { MyComponent } from '@/components';

export const App = () => {
  return <MyComponent title="Test" onAction={() => {}} />;
};
```

### Component Best Practices

- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks
- Use composition over inheritance
- Prop drill only when necessary (use Context for global state)
- Memoize components that receive many props

---

## State Management

### Local State

Use `useState` for component-level state:

```typescript
const [count, setCount] = useState(0);
const [items, setItems] = useState<Item[]>([]);
```

### Global State

Use React Context for app-wide state:

```typescript
// contexts/MyContext.tsx
import { createContext, useContext } from 'react';

interface MyContextType {
  value: string;
  setValue: (value: string) => void;
}

const MyContext = createContext<MyContextType | undefined>(undefined);

export const MyProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [value, setValue] = useState('');

  return (
    <MyContext.Provider value={{ value, setValue }}>
      {children}
    </MyContext.Provider>
  );
};

export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
};
```

### LocalStorage

Use utility functions from `utils/storage.ts`:

```typescript
import { loadFromLocalStorage, saveToLocalStorage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/constants/app';

// Load data
const data = loadFromLocalStorage(STORAGE_KEYS.TICKETS, MOCK_TICKETS);

// Save data
useEffect(() => {
  saveToLocalStorage(STORAGE_KEYS.TICKETS, tickets);
}, [tickets]);
```

---

## Utilities & Helpers

### Using Formatters

```typescript
import {
  formatDate,
  formatDateTime,
  formatWeight,
  formatCurrency,
} from '@/utils/formatters';

// Format date
const dateStr = formatDate(new Date()); // "22/11/2025"

// Format weight
const weightStr = formatWeight(1000); // "1,000 kg"

// Format currency
const priceStr = formatCurrency(1000000); // "1,000,000 ₫"
```

### Using Validators

```typescript
import {
  isValidWeight,
  isValidPlateNumber,
  isRequired,
  hasRequiredFields,
} from '@/utils/validators';

// Validate weight
if (!isValidWeight(weight)) {
  console.error('Invalid weight');
}

// Validate required fields
if (!hasRequiredFields(formData, ['name', 'email'])) {
  console.error('Missing required fields');
}
```

### Using Constants

```typescript
import { STORAGE_KEYS, SCREENS, ID_PREFIXES } from '@/constants/app';

// Use storage keys
const tickets = loadFromLocalStorage(STORAGE_KEYS.TICKETS, []);

// Use screen names
if (activeScreen === SCREENS.MAIN) {
  // Render main screen
}

// Use ID prefixes
const customerId = `${ID_PREFIXES.CUSTOMER}${Date.now()}`;
```

---

## Testing & Validation

### Type Checking

```bash
# Check TypeScript errors
npm run type-check
```

### Linting

```bash
# Check code quality
npm run lint

# Fix linting errors
npm run lint:fix
```

### Formatting

```bash
# Format code
npm run format

# Check if code is formatted
npm run format:check
```

### Validation

```bash
# Run all checks (type-check, lint, format-check)
npm run validate
```

---

## Common Tasks

### Adding a New Feature

1. Create component(s) in appropriate folder
2. Add types to `types.ts` if needed
3. Add constants to `constants/app.ts` if needed
4. Add utility functions if needed
5. Update component exports in `index.ts`
6. Test with `npm run dev`
7. Run validation: `npm run validate`

### Adding a New Utility Function

1. Create/update file in `utils/` folder
2. Add JSDoc comments
3. Export from `utils/index.ts`
4. Use in components

### Adding a New Constant

1. Add to `constants/app.ts`
2. Export from the constants file
3. Use in components/utilities

### Debugging

```typescript
// Use React DevTools
// Install: https://react-devtools-tutorial.vercel.app/

// Use console logging
console.log('Debug:', value);

// Use debugger statement
debugger;

// Use VS Code debugger
// .vscode/launch.json is configured
```

---

## Troubleshooting

### Module not found errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors

```bash
# Check for type errors
npm run type-check

# Restart TypeScript server in VS Code
# Cmd+Shift+P > "TypeScript: Restart TS Server"
```

### Build errors

```bash
# Clear build cache
rm -rf dist

# Rebuild
npm run build
```

### Dev server not starting

```bash
# Check if port 5173 is in use
lsof -i :5173

# Kill process using port
kill -9 <PID>

# Restart dev server
npm run dev
```

### Import path issues

- Use `@/` alias for imports from `src/`
- Example: `import { MyComponent } from '@/components'`
- Configured in `vite.config.ts` and `tsconfig.json`

---

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)

---

**Happy coding! 🚀**

