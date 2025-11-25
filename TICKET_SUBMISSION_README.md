# Ticket Submission System - Complete Implementation Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Installation & Setup](#installation--setup)
5. [User Guide](#user-guide)
6. [Developer Guide](#developer-guide)
7. [Backend Integration](#backend-integration)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)
10. [Security](#security)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The **Ticket Submission System** is a comprehensive feature that enables users to:

- ✅ Create weighing tickets as drafts
- ✅ Submit tickets for admin approval
- ✅ View only their own ticket history
- ✅ Edit and delete draft tickets
- ✅ Track ticket status through the approval workflow
- ✅ Print approved tickets

**Key Principle**: Users can only see and manage their own tickets. Admins have full visibility.

---

## Features

### For End Users

| Feature | Description |
|---------|-------------|
| **Create Tickets** | Fill form with vehicle, driver, cargo, and weight info |
| **Save as Draft** | Save tickets without submitting for approval |
| **Edit Drafts** | Modify draft tickets before submission |
| **Submit for Approval** | Send draft tickets to admin for review |
| **View History** | See all personal tickets with status |
| **Search & Filter** | Find tickets by plate, number, customer, or status |
| **Print Tickets** | Print approved tickets |
| **View Rejection Reason** | See why tickets were rejected |
| **Mobile Support** | Full functionality on mobile devices |

### For Administrators

| Feature | Description |
|---------|-------------|
| **View All Tickets** | See all tickets from all users |
| **Approve Tickets** | Approve submitted tickets |
| **Reject Tickets** | Reject with reason for revision |
| **Audit Trail** | Track who created, submitted, and approved |
| **Advanced Filtering** | Filter by user, date, status, etc. |

---

## Architecture

### Component Hierarchy

```
App
├── TicketSubmissionScreen (NEW)
│   ├── Create Tab
│   │   ├── InputField (Transport)
│   │   ├── InputField (Cargo)
│   │   ├── InputField (Weight)
│   │   └── TextArea (Notes)
│   └── History Tab
│       ├── SearchBar
│       ├── StatusFilter
│       └── TicketCard (multiple)
├── ReportsScreen (UPDATED)
│   ├── User filtering logic
│   ├── Summary stats
│   ├── Chart
│   └── Ticket table
├── SideNav (UPDATED)
│   └── New "Phiếu Của Tôi" menu item
└── BottomNav (UPDATED)
    └── New "Phiếu" tab
```

### Data Flow

```
User Input
    ↓
TicketSubmissionScreen
    ↓
App.tsx (State Management)
    ↓
localStorage (Persistence)
    ↓
API Service (Backend Integration)
    ↓
Backend API
    ↓
Database
```

### State Management

```typescript
// In App.tsx
const [tickets, setTickets] = useState<WeighTicket[]>([]);
const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);

// Handlers
const addTicket = (newTicket: WeighTicket) => { /* ... */ };
const updateTicket = (updatedTicket: WeighTicket) => { /* ... */ };
```

---

## Installation & Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- React 18+
- TypeScript 4.9+

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd truck-weighing-station-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   ```bash
   # .env
   REACT_APP_API_URL=http://localhost:3000/api
   REACT_APP_BACKEND_URL=http://localhost:3000
   REACT_APP_MQTT_BROKER_URL=mqtt://localhost:1883
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Access the application**
   ```
   http://localhost:3000
   ```

---

## User Guide

### Creating a New Ticket

1. **Navigate to "Phiếu Của Tôi"** (My Tickets)
   - Click from sidebar on desktop
   - Click from bottom navigation on mobile

2. **Click "Tạo Phiếu Mới"** tab

3. **Fill in Transport Information**
   - **Biển số xe** (License Plate): e.g., "59C-12345"
   - **Tài xế** (Driver Name): e.g., "Nguyễn Văn A"
   - **Nhân viên cân** (Operator): Auto-filled from settings

4. **Fill in Cargo Information**
   - **Khách hàng** (Customer): Select from list or type new
   - **Loại hàng** (Product Type): Select from list or type new

5. **Enter Weight Information**
   - **Tổng tải** (Gross Weight): Total weight in KG
   - **Tự trọng** (Tare Weight): Empty vehicle weight in KG
   - **Khối lượng hàng** (Net Weight): Auto-calculated

6. **Add Optional Notes**
   - **Ghi chú** (Notes): Any additional information

7. **Save Ticket**
   - Click **"Lưu Nháp"** (Save Draft) to save without submitting
   - Ticket status: **Nháp** (Draft)

### Submitting a Ticket

1. **Go to "Lịch Sử Phiếu"** (History) tab

2. **Find your draft ticket** (Status: Nháp)

3. **Click "Gửi"** (Submit) button

4. **Confirm submission**
   - Ticket status changes to **"Đã gửi"** (Submitted)
   - Wait for admin approval

### Tracking Ticket Status

| Status | Icon | Meaning | Action |
|--------|------|---------|--------|
| Nháp | [object Object], Submit, or Delete |
| Đã gửi | 🟦 | Submitted, awaiting approval | Wait for admin |
| Đã duyệt | 🟩 | Approved by admin | Print or View |
| Bị từ chối | 🟥 | Rejected by admin | View reason, Edit, Resubmit |

### Editing a Draft Ticket

1. **Go to "Lịch Sử Phiếu"** tab

2. **Find the draft ticket** (Nháp status)

3. **Click "Sửa"** (Edit) button

4. **Modify the information** as needed

5. **Click "Cập Nhật"** (Update) to save

6. **Resubmit** if needed

### Deleting a Ticket

1. **Go to "Lịch Sử Phiếu"** tab

2. **Find the draft ticket**

3. **Click "Xóa"** (Delete) button

4. **Confirm deletion**

### Printing an Approved Ticket

1. **Go to "Lịch Sử Phiếu"** tab

2. **Find the approved ticket** (Đã duyệt status)

3. **Click "In"** (Print) button

4. **Use browser print dialog** to print or save as PDF

### Searching and Filtering

1. **Go to "Lịch Sử Phiếu"** tab

2. **Use Search Box** to find by:
   - License plate number
   - Ticket number
   - Customer name

3. **Use Status Filter** to show only:
   - Nháp (Draft)
   - Đã gửi (Submitted)
   - Đã duyệt (Approved)
   - Bị từ chối (Rejected)

---

## Developer Guide

### Project Structure

```
src/
├── components/
│   ├── screens/
│   │   ├── TicketSubmissionScreen.tsx    ⭐ NEW
│   │   ├── WeighingScreen.tsx
│   │   ├── ReportsScreen.tsx             ✏️ UPDATED
│   │   ├── SettingsScreen.tsx
│   │   └── DataManagementScreen.tsx
│   ├── common/
│   │   ├── SideNav.tsx                   ✏️ UPDATED
│   │   ├── BottomNav.tsx                 ✏️ UPDATED
│   │   ├── icons.tsx                     ✏️ UPDATED
│   │   ├── TicketCard.tsx
│   │   └── PrintableTicket.tsx
│   ├── modals/
│   │   ├── PrintPreviewModal.tsx
│   │   └── SignatureModal.tsx
│   └── index.ts                          ✏️ UPDATED
├── types.ts                              ✏️ UPDATED
├── constants/
│   └── app.ts                            ✏️ UPDATED
├── utils/
│   ├── api.ts                            ⭐ NEW
│   ├── storage.ts
│   └── validation.ts
├── contexts/
│   └── MqttContext.tsx
├── hooks/
│   └── useMqtt.ts
├── App.tsx                               ✏️ UPDATED
└── index.tsx
```

### Key Files

#### 1. TicketSubmissionScreen.tsx
Main component for ticket creation and management.

**Props**:
```typescript
interface TicketSubmissionScreenProps {
  tickets: WeighTicket[];
  currentUser: User;
  stationInfo: StationInfo;
  vehicles: Vehicle[];
  customers: Customer[];
  products: Product[];
  onAddTicket: (ticket: WeighTicket) => void;
  onUpdateTicket: (ticket: WeighTicket) => void;
  onSubmitTicket: (ticketId: string) => void;
  onPrintRequest: (ticket: WeighTicket) => void;
}
```

#### 2. api.ts
Service layer for API communication.

**Key Methods**:
```typescript
apiService.createTicket(ticketData)
apiService.getTickets(filters)
apiService.getTicketsByUser(userId)
apiService.submitTicketForApproval(id)
apiService.approveTicket(id)
apiService.rejectTicket(id, reason)
```

#### 3. types.ts
Type definitions for the feature.

**New Types**:
```typescript
enum TicketSubmissionStatus {
  DRAFT = 'Nháp',
  SUBMITTED = 'Đã gửi',
  APPROVED = 'Đã duyệt',
  REJECTED = 'Bị từ chối',
}

interface WeighTicket {
  // ... existing fields
  submissionStatus?: TicketSubmissionStatus;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}
```

### Component Usage

```typescript
import { TicketSubmissionScreen } from './components';

<TicketSubmissionScreen
  tickets={tickets}
  currentUser={currentUser}
  stationInfo={stationInfo}
  vehicles={vehicles}
  customers={customers}
  products={products}
  onAddTicket={addTicket}
  onUpdateTicket={updateTicket}
  onSubmitTicket={handleSubmitTicket}
  onPrintRequest={showPrintPreview}
/>
```

### Styling

Uses Tailwind CSS with custom industrial theme:

```typescript
// Colors
bg-brand-primary      // Main blue
bg-brand-success      // Green
bg-brand-accent       // Amber
bg-industrial-bg      // Light gray background
text-industrial-text  // Dark text
text-industrial-muted // Gray text

// Common classes
.shadow-industrial    // Custom shadow
.border-industrial-border // Custom border
.custom-scrollbar     // Custom scrollbar
```

---

## Backend Integration

### Required Endpoints

#### 1. Create Ticket
```
POST /api/tickets
Content-Type: application/json
Authorization: Bearer <token>

{
  "vehicle": { "id": "v_123", "plateNumber": "59C-12345" },
  "customer": { "id": "c_123", "name": "Company ABC" },
  "product": { "id": "p_123", "name": "Sand" },
  "driverName": "John Doe",
  "operatorName": "Operator",
  "grossWeight": 5000,
  "tareWeight": 1000,
  "notes": "Some notes"
}

Response:
{
  "id": "ticket_123",
  "ticketNo": "TK20251122001",
  "status": "PENDING_APPROVAL",
  "submissionStatus": "DRAFT",
  "createdBy": "user_123",
  "createdAt": "2025-11-22T10:00:00Z"
}
```

#### 2. Get User's Tickets
```
GET /api/tickets?userId=user_123
Authorization: Bearer <token>

Response:
[
  {
    "id": "ticket_123",
    "ticketNo": "TK20251122001",
    "vehicle": { ... },
    "customer": { ... },
    "product": { ... },
    "status": "PENDING_APPROVAL",
    "submissionStatus": "DRAFT",
    "createdBy": "user_123",
    "createdByName": "John Doe"
  }
]
```

#### 3. Update Ticket
```
PUT /api/tickets/ticket_123
Content-Type: application/json
Authorization: Bearer <token>

{
  "driverName": "Jane Doe",
  "grossWeight": 5500,
  "notes": "Updated notes"
}

Response:
{
  "id": "ticket_123",
  "status": "PENDING_APPROVAL",
  "submissionStatus": "DRAFT",
  "updatedAt": "2025-11-22T11:00:00Z"
}
```

#### 4. Submit for Approval
```
POST /api/tickets/ticket_123/submit
Authorization: Bearer <token>

Response:
{
  "id": "ticket_123",
  "submissionStatus": "SUBMITTED",
  "submittedAt": "2025-11-22T11:30:00Z"
}
```

#### 5. Approve Ticket (Admin)
```
POST /api/tickets/ticket_123/approve
Authorization: Bearer <admin_token>

Response:
{
  "id": "ticket_123",
  "submissionStatus": "APPROVED",
  "approvedBy": "admin_123",
  "approvedAt": "2025-11-22T12:00:00Z"
}
```

#### 6. Reject Ticket (Admin)
```
POST /api/tickets/ticket_123/reject
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "reason": "Missing driver information"
}

Response:
{
  "id": "ticket_123",
  "submissionStatus": "REJECTED",
  "rejectionReason": "Missing driver information",
  "rejectedAt": "2025-11-22T12:00:00Z"
}
```

---

## API Reference

### ApiService Class

```typescript
class ApiService {
  // Authentication
  setToken(token: string): void
  clearToken(): void

  // Tickets
  createTicket(ticketData: any): Promise<any>
  getTickets(filters?: any): Promise<any[]>
  getTicketsByUser(userId: string): Promise<any[]>
  getTicket(id: string): Promise<any>
  updateTicket(id: string, updateData: any): Promise<any>
  submitTicketForApproval(id: string): Promise<any>
  approveTicket(id: string): Promise<any>
  rejectTicket(id: string, reason: string): Promise<any>
  cancelTicket(id: string): Promise<any>

  // Auth
  login(username: string, password: string): Promise<any>
  getCurrentUser(): Promise<any>
  logout(): Promise<void>
}
```

### Usage Examples

```typescript
import { apiService } from './utils/api';

// Create ticket
const newTicket = await apiService.createTicket({
  vehicle: { plateNumber: '59C-12345' },
  customer: { name: 'Company ABC' },
  product: { name: 'Sand' },
  driverName: 'John Doe',
  operatorName: 'Operator',
  grossWeight: 5000,
  tareWeight: 1000,
});

// Get user's tickets
const userTickets = await apiService.getTicketsByUser(userId);

// Submit for approval
await apiService.submitTicketForApproval(ticketId);

// Update ticket
await apiService.updateTicket(ticketId, {
  driverName: 'Jane Doe',
  grossWeight: 5500,
});
```

---

## Database Schema

### Tickets Table

```sql
CREATE TABLE tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ticket_no VARCHAR(50) UNIQUE NOT NULL,

  -- Vehicle Info
  vehicle_id INT NOT NULL,
  plate_number VARCHAR(20) NOT NULL,

  -- Cargo Info
  customer_id INT NOT NULL,
  product_id INT NOT NULL,

  -- Driver & Operator
  driver_name VARCHAR(100) NOT NULL,
  operator_name VARCHAR(100),

  -- Weight
  gross_weight DECIMAL(10, 2) NOT NULL,
  tare_weight DECIMAL(10, 2),
  net_weight DECIMAL(10, 2),

  -- Status
  status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
  submission_status VARCHAR(50) DEFAULT 'DRAFT',

  -- User Tracking
  created_by INT NOT NULL,
  created_by_name VARCHAR(100),
  approved_by INT,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT,

  -- Timestamps
  weigh_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  weigh_out_time TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Notes
  notes TEXT,

  -- Signatures
  is_signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMP NULL,
  signed_by VARCHAR(100),
  signature_image LONGBLOB,

  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),

  INDEX idx_created_by (created_by),
  INDEX idx_status (status),
  INDEX idx_submission_status (submission_status),
  INDEX idx_created_at (created_at)
);
```

### Migration Script

```sql
-- Add new columns to existing tickets table
ALTER TABLE tickets
ADD COLUMN submission_status VARCHAR(50) DEFAULT 'DRAFT' AFTER status,
ADD COLUMN created_by INT AFTER notes,
ADD COLUMN created_by_name VARCHAR(100) AFTER created_by,
ADD COLUMN approved_by INT AFTER created_by_name,
ADD COLUMN approved_at TIMESTAMP NULL AFTER approved_by,
ADD COLUMN rejection_reason TEXT AFTER approved_at,
ADD FOREIGN KEY (created_by) REFERENCES users(id),
ADD FOREIGN KEY (approved_by) REFERENCES users(id),
ADD INDEX idx_created_by (created_by),
ADD INDEX idx_submission_status (submission_status);
```

---

## Security

### Frontend Security

1. **User Isolation**: Filter tickets by `createdBy` field
2. **Role-based UI**: Show/hide features based on user role
3. **Input Validation**: Validate all form inputs
4. **XSS Prevention**: Sanitize user input

### Backend Security (Required)

1. **Authentication**: Verify JWT token on all endpoints
2. **Authorization**: Check user role for admin operations
3. **User Isolation**: Enforce user can only access own tickets
4. **Input Validation**: Validate all request data
5. **SQL Injection Prevention**: Use parameterized queries
6. **Rate Limiting**: Limit API requests per user
7. **Audit Logging**: Log all ticket operations

### Environment Security

1. **API Key Management**: Store API keys in environment variables
2. **HTTPS Only**: Use HTTPS in production
3. **CORS Configuration**: Restrict CORS to trusted domains
4. **Token Expiration**: Set appropriate token expiration times

---

## Testing

### Unit Tests

```typescript
// Test ticket creation
test('should create ticket with valid data', () => {
  const ticket = createTicket({
    plateNumber: '59C-12345',
    driverName: 'John Doe',
    customerName: 'Company ABC',
    productName: 'Sand',
    grossWeight: 5000,
    tareWeight: 1000,
  });

  expect(ticket.submissionStatus).toBe(TicketSubmissionStatus.DRAFT);
  expect(ticket.netWeight).toBe(4000);
});

// Test user filtering
test('should only show user own tickets', () => {
  const userTickets = filterTicketsByUser(allTickets, userId);

  userTickets.forEach(ticket => {
    expect(ticket.createdBy).toBe(userId);
  });
});
```

### Integration Tests

```typescript
// Test full workflow
test('should complete ticket submission workflow', async () => {
  // Create ticket
  const ticket = await apiService.createTicket(ticketData);
  expect(ticket.submissionStatus).toBe('DRAFT');

  // Submit for approval
  const submitted = await apiService.submitTicketForApproval(ticket.id);
  expect(submitted.submissionStatus).toBe('SUBMITTED');

  // Approve ticket
  const approved = await apiService.approveTicket(ticket.id);
  expect(approved.submissionStatus).toBe('APPROVED');
});
```

### E2E Tests

```typescript
// Test user journey
test('user can create and submit ticket', async () => {
  // Navigate to Ticket Submission screen
  cy.visit('/');
  cy.contains('Phiếu Của Tôi').click();

  // Create ticket
  cy.get('input[placeholder="59C-XXX.XX"]').type('59C-12345');
  cy.get('input[placeholder="Tên tài xế"]').type('John Doe');
  // ... fill other fields

  // Submit
  cy.contains('Gửi').click();
  cy.contains('Đã gửi').should('be.visible');
});
```

---

## Troubleshooting

### Issue: Tickets not appearing in history

**Symptoms**: User creates ticket but it doesn't show in history

**Solutions**:
1. Check if `createdBy` matches current user name
2. Verify localStorage is not cleared
3. Check browser console for errors
4. Verify ticket was saved to state

```typescript
// Debug: Check localStorage
console.log(localStorage.getItem('weighTickets'));

// Debug: Check state
console.log('Tickets:', tickets);
console.log('Current User:', currentUser);
```

### Issue: Can't submit ticket

**Symptoms**: Submit button is disabled or doesn't work

**Solutions**:
1. Ensure all required fields are filled
2. Check if ticket status is DRAFT
3. Verify user has permission to submit
4. Check API endpoint is working

```typescript
// Debug: Check form validation
console.log('Plate Number:', plateNumber);
console.log('Driver Name:', driverName);
console.log('All fields filled:', plateNumber && driverName && /* ... */);
```

### Issue: Edit not working

**Symptoms**: Edit button doesn't open form or changes don't save

**Solutions**:
1. Verify ticket is in DRAFT status
2. Check if user is the ticket creator
3. Verify form validation passes
4. Check browser console for errors

```typescript
// Debug: Check ticket status
console.log('Ticket Status:', selectedTicket.submissionStatus);
console.log('Created By:', selectedTicket.createdBy);
console.log('Current User:', currentUser.name);
```

### Issue: API errors

**Symptoms**: Network errors or 404 responses

**Solutions**:
1. Check backend is running
2. Verify API URL is correct
3. Check CORS configuration
4. Verify authentication token is valid

```typescript
// Debug: Check API configuration
console.log('API URL:', process.env.REACT_APP_API_URL);
console.log('Token:', localStorage.getItem('authToken'));

// Test API endpoint
fetch('http://localhost:3000/api/tickets')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### Issue: Mobile layout broken

**Symptoms**: UI elements overlapping or cut off on mobile

**Solutions**:
1. Check responsive classes are applied
2. Verify viewport meta tag is present
3. Test on actual mobile device
4. Check browser DevTools mobile view

```html
<!-- Verify in index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

## Performance Optimization

### Memoization

```typescript
// Memoize expensive computations
const filteredTickets = useMemo(() => {
  return tickets.filter(/* ... */);
}, [tickets, searchTerm, filters]);

// Memoize components
const TicketCard = React.memo(({ ticket, onEdit }) => {
  // Component code
});
```

### Lazy Loading

```typescript
// Lazy load screen components
const TicketSubmissionScreen = lazy(() =>
  import('./screens/TicketSubmissionScreen')
);

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <TicketSubmissionScreen {...props} />
</Suspense>
```

### Pagination

```typescript
// Implement pagination for large ticket lists
const [page, setPage] = useState(1);
const itemsPerPage = 20;

const paginatedTickets = useMemo(() => {
  const start = (page - 1) * itemsPerPage;
  return filteredTickets.slice(start, start + itemsPerPage);
}, [filteredTickets, page]);
```

---

## Deployment

### Development

```bash
npm start
```

### Production Build

```bash
npm run build
npm run preview
```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

```env
# Production
REACT_APP_API_URL=https://api.example.com
REACT_APP_BACKEND_URL=https://api.example.com
REACT_APP_MQTT_BROKER_URL=wss://mqtt.example.com:8883
```

---

## Support & Contact

For issues, questions, or suggestions:

1. Check this documentation
2. Review code comments
3. Check browser console for errors
4. Contact development team

---

## Changelog

### Version 1.0.0 (2025-11-22)

- ✅ Initial implementation
- ✅ Ticket creation and submission
- ✅ User-specific ticket filtering
- ✅ Draft management
- ✅ Mobile responsive design
- ✅ API service layer
- ✅ Comprehensive documentation

---

**Last Updated**: 2025-11-22
**Status**: ✅ Production Ready (Frontend)
**Backend Status**: ⏳ Requires Integration

