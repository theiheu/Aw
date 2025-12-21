# Hệ thống Trạm cân Xe tải

Hệ thống trạm cân xe tải hoàn chỉnh, bao gồm:

- **Backend (NestJS)**: API, WebSocket, quản lý dữ liệu.
- **Frontend (React/Vite)**: Giao diện người dùng, tạo phiếu cân, báo cáo.
- **Agent (Python)**: Đọc dữ liệu từ cân điện tử (COM port) và đẩy về backend.
- **Database (PostgreSQL)**: Lưu trữ dữ liệu phiếu cân, khách hàng, xe, sản phẩm.
- **MQTT Broker (Mosquitto)**: (Tùy chọn) Hỗ trợ các kịch bản IoT khác.

## Kiến trúc

Hệ thống hoạt động theo kiến trúc Client-Server với luồng dữ liệu như sau:

1. **Agent (PC nối cân)**: Đọc dữ liệu từ cân qua cổng COM (ví dụ: COM3), sau đó gửi dữ liệu này tới Backend qua HTTP POST.
2. **Backend**: Nhận dữ liệu từ Agent, sau đó phát (broadcast) dữ liệu này tới tất cả các client (trình duyệt) đang kết nối qua WebSocket.
3. **Frontend**: Nhận dữ liệu cân trực tiếp từ WebSocket và hiển thị cho người dùng. Người dùng có thể tạo phiếu cân, quản lý dữ liệu, in ấn và xem báo cáo.

  <!-- Thay thế bằng link ảnh kiến trúc của bạn -->

### Ưu điểm của kiến trúc này:

- **Đơn giản hóa Frontend**: Frontend không cần kết nối trực tiếp tới MQTT broker, giảm thiểu lỗi cấu hình phía người dùng (port, path, TLS).
- **Tập trung xử lý tại Backend**: Dễ dàng quản lý, lưu trữ, và mở rộng các quy tắc nghiệp vụ.
- **Bảo mật**: Dễ dàng bảo vệ API endpoint của backend hơn là bảo vệ MQTT broker.

## Yêu cầu hệ thống

- **Docker** và **Docker Compose**: Để chạy backend, frontend, database.
- **Python 3.8+** và **pip**: Để chạy Agent trên máy tính nối với cân.
- **Cân điện tử** có cổng COM và khả năng gửi dữ liệu qua cổng này.

## Hướng dẫn cài đặt và chạy

### 1. Khởi động Backend và Frontend

Trên máy chủ của bạn (có thể là máy tính local hoặc server), chạy lệnh sau tại thư mục gốc của dự án:

```bash
docker compose up -d --build
```

Lệnh này sẽ build và khởi động các service sau:

- `weigh-backend`: Backend API, lắng nghe trên port `4000`.
- `weigh-frontend`: Giao diện web, lắng nghe trên port `80`.
- `weigh-db`: Cơ sở dữ liệu PostgreSQL, lắng nghe trên port `5433`.
- `weigh-mqtt`: MQTT Broker (tùy chọn), lắng nghe trên port `1883` (TCP) và `9001` (WebSocket).

Sau khi khởi động, bạn có thể truy cập giao diện web tại `http://<IP_máy_chủ>`.

### 2. Cấu hình và chạy Agent

Trên máy tính được kết nối trực tiếp với cân điện tử qua cổng COM:

**a. Cài đặt thư viện cần thiết:**

```bash
pip install -r apps/agent/requirements.txt
```

**b. Cấu hình Agent:**

Mở file `apps/agent/config.json` và chỉnh sửa các thông số sau:

- **Kết nối cân:**
  - `simulateScale`: `false` (để đọc từ cân thật).
  - `serialPort`: Cổng COM của cân (ví dụ: `"COM3"`).
  - `baudRate`, `bytesize`, `parity`, `stopbits`: Cấu hình theo thông số của cân.

- **Kết nối Backend:**
  - `backendEnabled`: `true`.
  - `backendUrl`: URL của backend (ví dụ: `"http://<IP_máy_chủ_backend>:4000"`).

**c. Chạy Agent:**

```bash
python apps/agent/weigh_agent_cli.py --config apps/agent/config.json
```

Agent sẽ bắt đầu đọc dữ liệu từ cân và đẩy về backend.

### 3. Cấu hình Frontend

Thông thường, bạn không cần cấu hình gì thêm. Giao diện web sẽ tự động kết nối WebSocket tới backend.

Nếu bạn cần thay đổi URL của WebSocket, vào **Cài đặt** -> **Kết nối Backend** và nhập URL của WebSocket, ví dụ: `ws://<IP_máy_chủ_backend>:4000/ws/weight`.

## Sử dụng

- **Màn hình cân**: Hiển thị số cân trực tiếp, tạo phiếu cân lần 1, lần 2, hoặc cân dịch vụ.
- **Báo cáo**: Xem lại lịch sử các phiếu cân, lọc theo ngày, khách hàng, sản phẩm.
- **Quản lý dữ liệu**: Thêm, sửa, xóa thông tin khách hàng, xe, sản phẩm.
- **Cài đặt**: Cấu hình thông tin trạm cân, kết nối, máy in.

## Troubleshooting

- **Không thấy số cân trên web?**
  - Kiểm tra log của Agent xem có lỗi đọc cổng COM hoặc gửi HTTP không.
  - Kiểm tra log của Backend (`docker compose logs -f weigh-backend`) xem có nhận được request từ Agent không.
  - Kiểm tra kết nối WebSocket trên trình duyệt (F12 -> Network -> WS).
  - Đảm bảo firewall trên máy chủ backend cho phép kết nối tới port `4000`.

- **Agent báo lỗi `400 Bad Request`?**
  - Đảm bảo backend đã được build lại với DTO mới nhất (`docker compose up -d --build weigh-backend`).

- **Lỗi kết nối từ máy khác trong mạng LAN?**
  - Đảm bảo backend đang listen trên `0.0.0.0` (đã cấu hình mặc định trong `main.ts`).
  - Đảm bảo `backendUrl` trong `config.json` của Agent là IP LAN của máy chủ backend, không phải `localhost`.