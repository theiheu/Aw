# Quick Start - Ticket Submission Feature

## For Users

### How to Create a Ticket

1. **Open the app** and look for **"Phiếu Của Tôi"** (My Tickets) in the left menu
2. **Click on "Tạo Phiếu Mới"** tab
3. **Fill in the form**:
   - **Biển số xe** (License plate): e.g., "59C-12345"
   - **Tài xế** (Driver): Enter driver name
   - **Nhân viên cân** (Operator): Auto-filled, can change
   - **Khách hàng** (Customer): Select or type customer name
   - **Loại hàng** (Product): Select or type product type
   - **Tổng tải** (Gross weight): Enter weight in KG
   - **Tự trọng** (Tare weight): Enter weight in KG
   - **Ghi chú** (Notes): Optional notes
4. **Click "Lưu Nháp"** (Save Draft) to save without submitting
5. **Go to "Lịch Sử Phiếu"** tab to see your ticket
6. **Click "Gửi"** (Submit) to send for admin approval

### How to View Your Tickets

1. **Click "Phiếu Của Tôi"** in the menu
2. **Click "Lịch Sử Phiếu"** tab
3. **See all your tickets** with their status:
   - 🟦 **Nháp** (Draft) - Not submitted yet
   - 🟦 **Đã gửi** (Submitted) - Waiting for approval
   - 🟩 **Đã duyệt** (Approved) - Ready to use
   - 🟥 **Bị từ chối** (Rejected) - Needs revision

### How to Edit a Draft Ticket

1. **Go to "Lịch Sử Phiếu"** tab
2. **Find the draft ticket** (Nháp status)
3. **Click "Sửa"** (Edit) button
4. **Modify the information**
5. **Click "Cập Nhật"** (Update) to save changes

### How to Delete a Ticket

1. **Go to "Lịch Sử Phiếu"** tab
2. **Find the draft ticket**
3. **Click "Xóa"** (Delete) button
4. **Confirm deletion**

### How to Print an Approved Ticket

1. **Go to "Lịch Sử Phiếu"** tab
2. **Find the approved ticket** (Đã duyệt status)
3. **Click "In"** (Print) button
4. **Print from your browser**

### How to Search Tickets

1. **Go to "Lịch Sử Phiếu"** tab
2. **Use the search box** to find by:
   - License plate number
   - Ticket number
   - Customer name
3. **Use the status filter** to show only specific statuses

---

## For Developers

### Installation

The feature is already integrated. Just ensure:

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

### File Structure

```
src/
├── components/
│   ├── screens/
│   │   └── TicketSubmissionScreen.tsx    # Main screen
│   ├── common/
│   │   ├── SideNav.tsx                   # Updated navigation
│   │   ├── BottomNav.tsx                 # Updated mobile nav
│   │   └── icons.tsx                     # Added XIcon
│   └── index.ts                          # Updated exports
├── types.ts                              # Updated types
├── constants/
│   └── app.ts                            # Updated constants
├── utils/
│   └── api.ts                            # New API service
└── App.tsx                               # Updated main app
```

### Key Components

#### TicketSubmissionScreen
```typescript
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

### API Service Usage

```typescript
import { apiService } from './utils/api';

// Create ticket
const ticket = await apiService.createTicket(ticketData);

// Get user's tickets
const userTickets = await apiService.getTicketsByUser(userId);

// Submit for approval
await apiService.submitTicketForApproval(ticketId);

// Update ticket
await apiService.updateTicket(ticketId, updateData);
```

### Type Definitions

```typescript
// New submission status
export enum TicketSubmissionStatus {
  DRAFT = 'Nháp',
  SUBMITTED = 'Đã gửi',
  APPROVED = 'Đã duyệt',
  REJECTED = 'Bị từ chối',
}

// Extended ticket interface
export interface WeighTicket {
  // ... existing fields
  submissionStatus?: TicketSubmissionStatus;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}
```

### Backend Integration Checklist

- [ ] Create `/api/tickets` POST endpoint
- [ ] Create `/api/tickets` GET endpoint with filters
- [ ] Create `/api/tickets/:id` GET endpoint
- [ ] Create `/api/tickets/:id` PUT endpoint
- [ ] Create `/api/tickets/:id/submit` POST endpoint
- [ ] Create `/api/tickets/:id/approve` POST endpoint
- [ ] Create `/api/tickets/:id/reject` POST endpoint
- [ ] Add database columns for submission tracking
- [ ] Implement user isolation in backend
- [ ] Add admin role check for approve/reject
- [ ] Test all endpoints with Postman
- [ ] Update API URL in environment variables

### Environment Variables

```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_BACKEND_URL=http://localhost:3000
REACT_APP_MQTT_BROKER_URL=mqtt://localhost:1883
```

### Testing

```bash
# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

### Common Issues

**Issue**: Tickets not appearing in history
- **Solution**: Check if `createdBy` matches current user name

**Issue**: Can't submit ticket
- **Solution**: Ensure all required fields are filled and ticket is in DRAFT status

**Issue**: Edit button not working
- **Solution**: Verify ticket is in DRAFT status and you are the creator

**Issue**: API errors
- **Solution**: Check backend is running and API URL is correct

### Customization

#### Change Screen Title
Edit `TicketSubmissionScreen.tsx`:
```typescript
<h1 className="text-xl font-extrabold text-industrial-text uppercase tracking-tight">
  Phiếu Cân Của Tôi  {/* Change this */}
</h1>
```

#### Change Status Colors
Edit the `SubmissionStatusBadge` component:
```typescript
case TicketSubmissionStatus.DRAFT:
  return {
    bg: 'bg-slate-100',  // Change background color
    text: 'text-slate-700',  // Change text color
    // ...
  };
```

#### Add New Fields
1. Update `WeighTicket` interface in `types.ts`
2. Add form input in `TicketSubmissionScreen.tsx`
3. Update API service in `api.ts`
4. Update backend schema

---

## Troubleshooting

### App won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

### Types not working
```bash
# Rebuild TypeScript
npm run build
```

### API not connecting
1. Check backend is running on correct port
2. Check `REACT_APP_API_URL` environment variable
3. Check browser console for CORS errors
4. Check network tab in DevTools

### Tickets disappearing
1. Check localStorage in DevTools
2. Check if data is being saved correctly
3. Check browser storage quota

---

## Next Steps

1. **Integrate Backend API** - Connect to real backend endpoints
2. **Add Email Notifications** - Notify users of approval/rejection
3. **Add Admin Dashboard** - Create admin approval interface
4. **Add Batch Operations** - Approve multiple tickets at once
5. **Add Export Feature** - Export tickets to Excel
6. **Add Digital Signatures** - Sign approved tickets

---

## Support

- Check `TICKET_SUBMISSION_FEATURE.md` for detailed documentation
- Check `IMPLEMENTATION_SUMMARY.md` for technical details
- Review code comments in source files
- Check browser console for error messages

---

**Last Updated**: 2025-11-22
**Version**: 1.0.0


