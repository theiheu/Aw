# Ticket Submission Feature Documentation

## Overview

This document describes the new **Ticket Submission** feature that allows users to create and submit weighing tickets for admin approval. The feature includes:

1. **User-specific ticket creation** - Users can create draft tickets
2. **Ticket submission workflow** - Users submit tickets to admin for approval
3. **User-only history view** - Users can only see their own tickets
4. **Admin approval system** - Admins can approve or reject submitted tickets

## Features

### 1. Ticket Submission Screen

**Location**: `src/components/screens/TicketSubmissionScreen.tsx`

The new screen provides two main tabs:

#### Tab 1: Create Ticket
- Users can create new weighing tickets with the following information:
  - **Vehicle Information**
    - License plate number
    - Driver name
    - Operator name
  - **Cargo Information**
    - Customer/Partner name
    - Product type
  - **Weight Information**
    - Gross weight (tổng tải)
    - Tare weight (tự trọng)
    - Net weight (auto-calculated)
  - **Notes** - Additional information about the shipment

**Features**:
- Auto-fill from vehicle history
- Datalist suggestions for customers, vehicles, and products
- Draft saving (tickets saved as DRAFT status)
- Edit existing draft tickets
- Delete draft tickets

#### Tab 2: History
- View all user's submitted tickets
- Filter by status:
  - **Nháp (Draft)** - Not yet submitted
  - **Đã gửi (Submitted)** - Waiting for admin approval
  - **Đã duyệt (Approved)** - Admin approved
  - **Bị từ chối (Rejected)** - Admin rejected with reason
- Search by plate number, ticket number, or customer name
- Print approved tickets
- Edit draft tickets
- Submit draft tickets for approval

### 2. Updated Types

**File**: `src/types.ts`

New enums and fields added:

```typescript
// New ticket status
export enum TicketStatus {
  PENDING_APPROVAL = 'Chờ xác nhận', // New
  // ... existing statuses
}

// New submission status tracking
export enum TicketSubmissionStatus {
  DRAFT = 'Nháp',
  SUBMITTED = 'Đã gửi',
  APPROVED = 'Đã duyệt',
  REJECTED = 'Bị từ chối',
}

// Extended WeighTicket interface
export interface WeighTicket {
  // ... existing fields
  submissionStatus?: TicketSubmissionStatus; // Track submission status
  createdBy?: string; // User ID who created
  createdByName?: string; // User name who created
  approvedBy?: string; // Admin ID who approved
  approvedAt?: Date; // When approved
  rejectionReason?: string; // If rejected, why
}
```

### 3. Updated Reports Screen

**File**: `src/components/screens/ReportsScreen.tsx`

**Changes**:
- Added `currentUser` prop to component
- Non-admin users now only see their own tickets
- Admin users see all tickets
- Filtering logic:
  ```typescript
  const visibleTickets = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return tickets; // Admins see all
    }
    // Non-admins see only their own
    return tickets.filter((t) => t.createdBy === currentUser?.name || !t.createdBy);
  }, [tickets, currentUser]);
  ```

### 4. Updated Navigation

**Files Modified**:
- `src/components/common/SideNav.tsx` - Added "Phiếu Của Tôi" menu item
- `src/components/common/BottomNav.tsx` - Added "Phiếu" tab for mobile
- `src/constants/app.ts` - Added `TICKET_SUBMISSION` screen constant

### 5. API Service

**File**: `src/utils/api.ts`

New API methods for ticket operations:

```typescript
// Create a new ticket
async createTicket(ticketData: any): Promise<any>

// Get tickets with filters
async getTickets(filters?: {
  stationId?: string;
  status?: string;
  from?: string;
  to?: string;
  userId?: string;
}): Promise<any[]>

// Get user's tickets only
async getTicketsByUser(userId: string): Promise<any[]>

// Get single ticket
async getTicket(id: string): Promise<any>

// Update ticket
async updateTicket(id: string, updateData: any): Promise<any>

// Submit ticket for approval
async submitTicketForApproval(id: string): Promise<any>

// Admin approve ticket
async approveTicket(id: string): Promise<any>

// Admin reject ticket
async rejectTicket(id: string, reason: string): Promise<any>

// Cancel ticket
async cancelTicket(id: string): Promise<any>
```

## User Workflow

### Creating and Submitting a Ticket

1. **Navigate to "Phiếu Của Tôi"** (My Tickets)
2. **Click "Tạo Phiếu Mới"** (Create New Ticket) tab
3. **Fill in ticket information**:
   - Vehicle plate number
   - Driver name
   - Customer name
   - Product type
   - Gross and tare weights
   - Optional notes
4. **Click "Lưu Nháp"** (Save Draft) to save without submitting
5. **Go to "Lịch Sử Phiếu"** (History) tab
6. **Find the draft ticket** and click **"Gửi"** (Submit)
7. **Ticket status changes to "Đã gửi"** (Submitted)
8. **Wait for admin approval**

### Viewing Ticket History

1. **Navigate to "Phiếu Của Tôi"**
2. **Click "Lịch Sử Phiếu"** tab
3. **View all your tickets** organized by status
4. **Use filters** to find specific tickets
5. **For approved tickets**: Click **"In"** (Print) to print the ticket
6. **For draft tickets**: Click **"Sửa"** (Edit) to modify or **"Xóa"** (Delete) to remove

### Editing Draft Tickets

1. **Go to History tab**
2. **Find draft ticket**
3. **Click "Sửa"** (Edit)
4. **Modify information**
5. **Click "Cập Nhật"** (Update) to save changes
6. **Submit again if needed**

## Admin Workflow (Backend Integration)

### Approving Tickets

1. Admin sees submitted tickets in admin panel
2. Admin reviews ticket details
3. Admin clicks "Duyệt" (Approve)
4. Ticket status changes to "Đã duyệt" (Approved)
5. User can now print the ticket

### Rejecting Tickets

1. Admin sees submitted tickets
2. Admin clicks "Từ chối" (Reject)
3. Admin provides rejection reason
4. Ticket status changes to "Bị từ chối" (Rejected)
5. User sees rejection reason and can edit and resubmit

## Data Storage

### Local Storage Keys

```typescript
STORAGE_KEYS = {
  TICKETS: 'weighTickets', // All tickets including submissions
  CUSTOMERS: 'weighCustomers',
  VEHICLES: 'weighVehicles',
  PRODUCTS: 'weighProducts',
  STATION_INFO: 'stationInfo',
}
```

### Date Fields for Serialization

```typescript
DATE_FIELDS = {
  TICKETS: ['weighInTime', 'weighOutTime', 'signedAt', 'approvedAt'],
  // ... others
}
```

## Backend Integration (Required)

To fully implement this feature, the backend needs to support:

### New Endpoints

```
POST /api/tickets - Create ticket
GET /api/tickets - Get all tickets (with filters)
GET /api/tickets?userId=X - Get user's tickets
GET /api/tickets/:id - Get single ticket
PUT /api/tickets/:id - Update ticket
POST /api/tickets/:id/submit - Submit for approval
POST /api/tickets/:id/approve - Admin approve
POST /api/tickets/:id/reject - Admin reject
POST /api/tickets/:id/cancel - Cancel ticket
```

### Database Fields to Add

```sql
ALTER TABLE tickets ADD COLUMN submission_status VARCHAR(50);
ALTER TABLE tickets ADD COLUMN created_by INT;
ALTER TABLE tickets ADD COLUMN approved_by INT;
ALTER TABLE tickets ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE tickets ADD COLUMN rejection_reason TEXT;
```

## Security Considerations

1. **User Isolation**: Users can only see their own tickets (enforced in frontend and should be enforced in backend)
2. **Admin-only Operations**: Approve/reject operations should only be available to admins
3. **Audit Trail**: Track who created, submitted, and approved each ticket
4. **Data Validation**: Validate all ticket data on both frontend and backend

## Future Enhancements

1. **Email Notifications**: Notify users when tickets are approved/rejected
2. **Batch Operations**: Allow admins to approve multiple tickets at once
3. **Advanced Filtering**: Filter by date range, customer, product type
4. **Export to Excel**: Export ticket history to Excel
5. **Digital Signatures**: Add digital signature support for approved tickets
6. **Webhook Integration**: Send notifications to external systems
7. **Mobile App**: Native mobile app for ticket submission
8. **QR Code**: Generate QR codes for tickets

## Testing Checklist

- [ ] Create new ticket with all fields
- [ ] Save ticket as draft
- [ ] Edit draft ticket
- [ ] Delete draft ticket
- [ ] Submit draft ticket for approval
- [ ] View ticket history
- [ ] Filter tickets by status
- [ ] Search tickets by plate number
- [ ] Print approved ticket
- [ ] View rejection reason
- [ ] Non-admin users can only see their tickets
- [ ] Admin users can see all tickets
- [ ] Ticket counter shows correct number

## Troubleshooting

### Tickets not appearing in history
- Check if `createdBy` field matches current user name
- Verify localStorage is not cleared
- Check browser console for errors

### Can't submit ticket
- Ensure all required fields are filled
- Check if ticket status is DRAFT
- Verify user has permission to submit

### Edit not working
- Ensure ticket is in DRAFT status
- Check if user is the ticket creator
- Verify form validation passes

## Code Examples

### Creating a Ticket Programmatically

```typescript
const newTicket: WeighTicket = {
  id: new Date().toISOString(),
  ticketNo: `TK${Date.now().toString().slice(-8)}`,
  vehicle: { id: `v_${Date.now()}`, plateNumber: '59C-12345' },
  customer: { id: `c_${Date.now()}`, name: 'Company ABC' },
  product: { id: `p_${Date.now()}`, name: 'Sand' },
  driverName: 'John Doe',
  operatorName: 'Operator Name',
  grossWeight: 5000,
  tareWeight: 1000,
  netWeight: 4000,
  weighInTime: new Date(),
  status: TicketStatus.PENDING_APPROVAL,
  submissionStatus: TicketSubmissionStatus.DRAFT,
  isSigned: false,
  notes: 'Some notes',
  createdBy: 'user_name',
  createdByName: 'User Name',
};
```

### Submitting a Ticket

```typescript
const handleSubmitTicket = (ticketId: string) => {
  const ticket = tickets.find((t) => t.id === ticketId);
  if (ticket) {
    updateTicket({
      ...ticket,
      submissionStatus: TicketSubmissionStatus.SUBMITTED,
    });
  }
};
```

## Support

For issues or questions about this feature, please contact the development team or refer to the main project README.


