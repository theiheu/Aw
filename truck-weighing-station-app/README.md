# Truck Weighing Station App

Ứng dụng quản lý trạm cân xe tải với giao diện hiện đại, hỗ trợ MQTT, WebSocket và tích hợp AI.

## 📑 Mục lục

- [Tính năng](#-tính-năng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Cài đặt nhanh](#-cài-đặt-nhanh)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Các lệnh npm](#-các-lệnh-npm)
- [Hướng dẫn phát triển](#-hướng-dẫn-phát-triển)
- [Triển khai Docker](#-triển-khai-docker)
- [Troubleshooting](#-troubleshooting)
- [Đóng góp](#-đóng-góp)
- [Giấy phép](#-giấy-phép)

---

## ✨ Tính năng

- 📊 **Quản lý dữ liệu cân xe tải** - Lưu trữ và quản lý thông tin cân hàng
- 📱 **Giao diện responsive** - Tối ưu cho desktop và mobile
- 🔗 **Hỗ trợ MQTT & WebSocket** - Kết nối real-time với thiết bị cân
- 🤖 **Tích hợp Gemini AI** - Hỗ trợ phân tích dữ liệu thông minh
- [object Object]** - In vé cân và báo cáo chi[object Object]ản lý danh sách vé cân** - Theo dõi lịch sử cân hàng
- ⚙️ **Cấu hình linh hoạt** - Tùy chỉnh thông tin trạm cân

---

## 🔧 Yêu cầu hệ thống

### Bắt buộc:
- **Node.js**: >= 18.17.0
- **npm**: >= 9.0.0

### Tùy chọn (cho Docker):
- **Docker**: >= 20.10
- **Docker Compose**: >= 1.29

### Kiểm tra phiên bản:
```bash
node --version      # v18.17.0 hoặc cao hơn
npm --version       # 9.0.0 hoặc cao hơn
docker --version    # 20.10 hoặc cao hơn (nếu dùng Docker)
```

---

## ⚡ Cài đặt nhanh

### 1️⃣ Clone repository
```bash
git clone <repository-url>
cd truck-weighing-station-app
```

### 2️⃣ Cài đặt dependencies
```bash
npm install
```

### 3️⃣ Chọn cách khởi chạy

#### **Option A: Docker (Khuyến nghị)**
```bash
docker-compose up -d
# Truy cập: http://localhost
```

#### **Option B: Frontend Local + Backend Docker**
```bash
docker-compose up -d mqtt db backend
npm run dev
# Truy cập: http://localhost:5173
```

#### **Option C: Frontend Dev Only**
```bash
npm run dev
# Truy cập: http://localhost:5173
```

---

## 📁 Cấu trúc dự án

```
truck-weighing-station-app/
├── src/
│   ├── components/          # React components
│   │   ├── screens/        # Màn hình chính
│   │   ├── modals/         # Modal dialogs
│   │   ├── common/         # Shared components
│   │   └── icons.tsx       # Icon components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── utils/              # Utility functions
│   ├── constants/          # Constants & config
│   ├── types.ts            # TypeScript types
│   ├── App.tsx             # Main component
│   └── index.tsx           # Entry point
├── config/                 # Configuration files
├── data/                   # Data directories
├── public/                 # Static files
├── docker-compose.yml      # Docker Compose config
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript config
├── package.json            # Dependencies
└── README.md               # This file
```

---

## 📝 Các lệnh npm

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy dev server (port 5173) |
| `npm run build` | Build cho production |
| `npm run preview` | Preview build |
| `npm run lint` | Kiểm tra code với ESLint |
| `npm run lint:fix` | Sửa lỗi ESLint tự động |
| `npm run format` | Format code với Prettier |
| `npm run format:check` | Kiểm tra format code |

---

## 💻 Hướng dẫn phát triển

### Setup Development Environment

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy dev server
npm run dev

# 3. Mở browser
# http://localhost:5173
```

### Cấu trúc Component

```typescript
// components/MyComponent.tsx
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

### Code Standards

- ✅ Sử dụng TypeScript cho type safety
- ✅ Tách component logic vào custom hooks
- ✅ Sử dụng `useCallback` để optimize performance
- ✅ Memoize components khi cần thiết
- ✅ Viết meaningful comments cho logic phức tạp
- ✅ Tuân theo ESLint & Prettier rules

### Linting & Formatting

```bash
# Kiểm tra code quality
npm run lint

# Sửa lỗi tự động
npm run lint:fix

# Format code
npm run format

# Kiểm tra format
npm run format:check
```

---

## 🐳 Triển khai Docker

### Khởi động services

```bash
# Khởi động tất cả services
docker-compose up -d

# Khởi động services cụ thể
docker-compose up -d mqtt db backend web

# Xem logs
docker-compose logs -f

# Dừng services
docker-compose down

# Xóa data volumes
docker-compose down -v
```

### Services

| Service | Port | Mô tả |
|---------|------|-------|
| **web** | 80 | Frontend (Nginx) |
| **backend** | 4000 | API server |
| **mqtt** | 1883 | MQTT broker |
| **db** | 5432 | PostgreSQL database |

### Production Deployment

```bash
# Build images
docker-compose build

# Khởi động production
docker-compose up -d

# Kiểm tra status
docker-compose ps

# Xem logs
docker-compose logs -f web
```

---

## 🔧 Troubleshooting

### Port đã được sử dụng

```bash
# Thay đổi port trong docker-compose.yml
ports:
  - "8080:80"  # Thay 80 thành 8080
```

### Database connection failed

```bash
# Reset database
docker-compose down -v
docker-compose up -d
```

### Frontend không kết nối backend

```bash
# Kiểm tra config/web.env
cat config/web.env

# Kiểm tra backend health
curl http://localhost:4000/health

# Xem backend logs
docker-compose logs backend
```

### MQTT connection failed

```bash
# Kiểm tra MQTT logs
docker-compose logs mqtt

# Kiểm tra MQTT config
cat config/mosquitto.conf
```

### Node modules issues

```bash
# Xóa node_modules và package-lock.json
rm -rf node_modules package-lock.json

# Cài đặt lại
npm install
```

---

## 🤝 Đóng góp

Chúng tôi rất hoan nghênh các đóng góp! Để đóng góp:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

---

## 📄 Giấy phép

Dự án này được cấp phép theo [MIT License](LICENSE).

---

## 🎉 Bắt đầu nào!

```bash
# 1. Clone & install
git clone <repository-url>
cd truck-weighing-station-app
npm install

# 2. Chọn cách khởi chạy
npm run dev

# 3. Mở browser
# http://localhost:5173
```

**Happy coding! 🚀**
