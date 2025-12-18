# Truck Weighing Station — Monorepo

Repo hợp nhất các thành phần: Backend (NestJS), Frontend (Vite/React), Weigh Agent (Python) và hạ tầng (MQTT). Bố cục đã được tinh gọn, nhất quán theo chuẩn apps/ và infra/ để dễ phát triển, triển khai.

## Cấu trúc thư mục

```
.
├─ apps/
│  ├─ backend/      # NestJS + TypeORM (PostgreSQL)
│  ├─ frontend/     # Vite + React, build thành image Nginx
│  └─ agent/        # Python Weigh Agent (đọc serial, MQTT, in PDF)
│
├─ infra/
│  └─ mosquitto/
│     ├─ config/    # mosquitto.conf (đã mở 1883 & 9001)
│     └─ data/      # volume dữ liệu/persistence cho broker
│
├─ docker-compose.yml
└─ (các file hướng dẫn/ghi chú khác)
```

Điểm khác so với trước:
- Di chuyển web-backend → apps/backend
- Di chuyển web-frontend → apps/frontend
- Di chuyển weigh-agent → apps/agent
- Cấu hình MQTT chuyển sang infra/mosquitto/config/mosquitto.conf

## Yêu cầu
- Docker & Docker Compose
- Node.js LTS (cho dev backend/frontend)
- Python 3.10+ (cho dev agent)
- PostgreSQL (nếu không dùng container DB đi kèm)

## Dịch vụ & Port mặc định
- Frontend (Nginx): http://localhost (port 80)
- Backend (NestJS): http://localhost:4000
- PostgreSQL: host 5433 (map về 5432 trong container)
- MQTT (Mosquitto): 1883 (TCP), 9001 (WebSocket)

Lý do DB dùng 5433 ở host: tránh đụng với PostgreSQL cài sẵn trên máy.

## Chạy nhanh với Docker

1) Build & up:
```
docker compose up -d --build
```

2) Kiểm tra tình trạng:
```
docker compose ps

docker compose logs -f backend | cat

docker compose logs -f mqtt | cat
```

3) Kiểm tra backend health:
- http://localhost:4000/api/health → { "status": "ok" }

4) Truy cập web:
- http://localhost

MQTT broker đã bật sẵn 1883 (TCP) và 9001 (WebSocket). Healthcheck của broker thực hiện publish/subscribe nội bộ để đảm bảo sẵn sàng trước khi backend khởi chạy.

## Cấu hình Backend (tối thiểu)
Backend đọc biến môi trường từ docker-compose:
- DB_HOST=db
- DB_PORT=5432
- DB_USER=weighuser
- DB_PASSWORD=weighpass
- DB_NAME=weighing
- JWT_SECRET=your-secret-key
- CORS_ORIGIN=*
- MQTT_HOST=mqtt
- MQTT_PORT=1883

Dev (ngoài Docker): tạo file .env trong apps/backend (tham khảo docker-compose) và chạy:
```
cd apps/backend
npm ci
npm run start:dev
```

## Cấu hình Frontend (dev)
```
cd apps/frontend
npm ci
npm run dev
# mở http://localhost:5173
```
Trong màn hình Cài đặt của app:
- Kết nối PC Cân (MQTT WS):
  - Giao thức: ws
  - Host: localhost (hoặc IP broker)
  - Port: 9001
  - Path: /
  - Machine ID: ví dụ weigh1
- Máy in: Print Secret phải khớp với agent

## Weigh Agent (PC trạm cân)
Agent không container hoá để sử dụng thiết bị serial và máy in trên PC.

Thiết lập nhanh (dev):
```
cd apps/agent
python3 -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
python3 weigh_agent_gui.py   # giao diện đồ hoạ
# hoặc: python3 weigh_agent_cli.py --simulate
```
Cấu hình tối thiểu (GUI hoặc config.json):
- machineId: weigh1
- mqttHost: 127.0.0.1 (nếu cùng máy broker), mqttPort: 1883
- printSecret: trùng với cấu hình trong Web
- Cài đặt serial tương ứng với cân thật hoặc bật simulate

## In phiếu qua backend (tùy chọn)
- Tạo print job: POST /api/print-jobs
- Hoặc in theo ticket: POST /api/print/tickets/:ticketId
- Kiểm tra job: GET /api/print-jobs/:id
- Tải PDF: GET /api/print-jobs/:id/pdf

Backend sẽ render PDF (Gotenberg) và publish job lên MQTT topic weigh/{machineId}/print/jobs. Agent tải PDF và in, sau đó phản hồi trạng thái.

Lưu ý: Nếu dùng render PDF qua Gotenberg, cần bổ sung service Gotenberg trong docker-compose (image gotenberg/gotenberg:8) và cấu hình biến GOTENBERG_URL + PUBLIC_BASE_URL cho backend.

## MQTT Topics chính (mặc định baseTopic = weigh)
- Publish cân: weigh/{machineId}/reading, weigh/{machineId}/reading/json
- Trạng thái: weigh/{machineId}/status (ONLINE, OFFLINE, PRINT_OK, PRINT_ERROR)
- Lệnh in (từ backend/web tới agent): weigh/{machineId}/print/jobs
- ACK in (từ agent về backend): weigh/{machineId}/print/acks

## Troubleshooting
- Port xung đột: sửa map trong docker-compose.yml
- MQTT unhealthy: xem logs của mqtt; healthcheck cần vài giây sau khởi động
- Frontend không kết nối MQTT WS: xác nhận WS 9001 mở, đúng host/port/path
- Agent không in ở Linux: cần cài cups-bsd, kiểm tra máy in bằng `lpstat -p -d`
- Print Secret sai → Agent từ chối in

## License
MIT © Your Team
