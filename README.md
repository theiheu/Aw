# Truck Weighing Station — Hướng dẫn setup chi tiết (Full Repo)

Tài liệu này hướng dẫn bạn khởi chạy toàn bộ hệ thống gồm 4 phần trong repo:
- web-frontend (React/Vite — Web App, hiển thị số cân realtime, quản lý phiếu, xe, tài xế…)
- web-backend (NestJS/TypeORM — REST API, lưu trữ trên PostgreSQL)
- weigh-agent (Python — Ứng dụng PC tại trạm cân: đọc cổng serial, publish MQTT, nhận lệnh in PDF)
- MQTT Broker (Mosquitto — TCP 1883 cho Agent, WebSocket 9001 cho Web)

Bạn có thể chạy theo 2 cách:
1) Dev Mode (chạy từng phần, dễ debug)
2) Docker (chạy các dịch vụ bằng container)

--------------------------------------------------------------------------------
## 1) Kiến trúc tổng quan

Luồng hoạt động chuẩn:
- PC trạm cân chạy weigh-agent đọc số cân từ cổng COM/tty → publish lên MQTT topic `weigh/{machineId}/reading`
- Web App kết nối MQTT WebSocket (WS 9001) để hiển thị realtime, tạo phiếu, gửi lệnh in
- Web gửi lệnh in PDF qua topic `weigh/{machineId}/print`
- Agent nhận lệnh, xác thực `printSecret` rồi in ra máy in nội bộ, đồng thời publish trạng thái `PRINT_OK/PRINT_ERROR`
- Backend cung cấp REST API và lưu trữ dữ liệu vào PostgreSQL (tuỳ chọn agent có thể đẩy events về Backend)

MQTT Topics (ví dụ machineId = weigh1):
- Publish cân: `weigh/weigh1/reading` (payload: số dạng text, hoặc JSON nếu bật readingJson)
- Publish trạng thái: `weigh/weigh1/status` (ONLINE, OFFLINE, PRINT_OK, PRINT_ERROR)
- Subscribe lệnh in: `weigh/weigh1/print` (payload JSON: { secret, pdfUrl|pdfBase64, printer? })

--------------------------------------------------------------------------------
## 2) Cấu trúc thư mục repo

```
/projects
  ├─ truck-weighing-station-app/
  │   └─ config/
  │       ├─ mosquitto.conf   # file cấu hình broker MQTT (sẽ mở cả TCP 1883 và WS 9001)
  │       └─ passwd           # user/pass cho MQTT (tuỳ chọn)
  │
  ├─ web-frontend/            # React/Vite, Dockerfile.web để build image Nginx
  ├─ web-backend/             # NestJS/TypeORM, kết nối PostgreSQL
  └─ weigh-agent/             # Python app (GUI/CLI), đọc serial + in ấn + MQTT
```

Các cổng mặc định:
- Web: 80 (Docker) / 5173 (Dev)
- Backend: 4000
- PostgreSQL: 5432 (user: weighuser, pass: weighpass, db: weighing)
- MQTT: 1883 (TCP), 9001 (WebSocket)

--------------------------------------------------------------------------------
## 3) Yêu cầu hệ thống

- Docker >= 20.10 & Docker Compose (khuyến nghị cho môi trường staging/prod)
- Node.js LTS 18+ (dev frontend/backend)
- Python 3.10+ (dev cho weigh-agent)
- PostgreSQL 14+ (local hoặc Docker)
- Hệ điều hành:
  - Windows: cài PDF reader mặc định (SumatraPDF/Adobe) để Agent in PDF
  - Linux: cần Tkinter (`sudo apt-get install python3-tk`) và CUPS CLI (`sudo apt-get install cups-bsd`) để in `lp/lpr`

Kiểm tra nhanh:
```
docker --version
docker compose version
node -v
python3 --version
```

--------------------------------------------------------------------------------
## 4) Khởi chạy nhanh (Dev Mode)

Cách này dành cho phát triển, debug. Bạn sẽ chạy từng thành phần.

### 4.1 Chạy PostgreSQL bằng Docker (khuyến nghị)
```
docker run -d --name weigh-postgres \
  -e POSTGRES_USER=weighuser \
  -e POSTGRES_PASSWORD=weighpass \
  -e POSTGRES_DB=weighing \
  -p 5432:5432 \
  -v pgdata:/var/lib/postgresql/data \
  postgres:15
```

### 4.2 Chạy MQTT (Mosquitto) có WebSocket 9001
1) Sửa file `truck-weighing-station-app/config/mosquitto.conf` để mở WS 9001 (nếu chưa có):
```
listener 1883
protocol mqtt

listener 9001
protocol websockets

allow_anonymous true
# Nếu dùng user/pass thì cấu hình:
# password_file /mosquitto/config/passwd
```
2) Chạy Mosquitto bằng Docker:
```
cd truck-weighing-station-app

docker run -it --rm \
  -p 1883:1883 -p 9001:9001 \
  -v $PWD/config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro \
  -v $PWD/config/passwd:/mosquitto/config/passwd:ro \
  -v $PWD/../truck-weighing-station-app/data/mosquitto:/mosquitto/data \
  eclipse-mosquitto:2
```
Ghi chú: Nếu bạn chạy trên Windows PowerShell, thay `$PWD` bằng đường dẫn tuyệt đối.

### 4.3 Chạy Backend (NestJS)
```
cd web-backend
cp .env.example .env  # nếu có; nếu không, tạo .env theo mẫu bên dưới
npm ci
npm run start:dev
```
Tạo file `.env` (mẫu):
```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=weighuser
DB_PASSWORD=weighpass
DB_NAME=weighing
DB_SYNCHRONIZE=true

# JWT
JWT_SECRET=your-secret-key
NODE_ENV=development
```
- Ở Dev, `DB_SYNCHRONIZE=true` giúp tự tạo/tự cập nhật schema DB.
- Ở Prod, đặt `DB_SYNCHRONIZE=false` và dùng migration.

Endpoints mặc định: http://localhost:4000

### 4.4 Chạy Frontend (React/Vite)
```
cd web-frontend
npm ci
npm run dev
# Mặc định: http://localhost:5173
```
- Mở web → Trang Cài đặt → tab “Kết nối PC Cân”
  - Giao thức: `ws`
  - IP Broker: `localhost` (hoặc IP máy chạy Docker Mosquitto)
  - Cổng: `9001`
  - Path: `/` (Mosquitto mặc định). Nếu dùng reverse proxy có path, điền đúng.
  - Machine ID: ví dụ `weigh1`
- Tab “Máy in”: Nhập `Print Secret` trùng với `weigh-agent/config.json`

### 4.5 Chạy Weigh Agent (PC trạm cân)
```
cd weigh-agent
python3 -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```
Chạy GUI (khuyến nghị):
```
python3 weigh_agent_gui.py
```
Cấu hình quan trọng trong GUI hoặc `weigh-agent/config.json`:
- `machineId`: ví dụ `weigh1` (phải trùng với Web)
- `mqttHost`: IP broker (VD `127.0.0.1` nếu chạy cùng máy)
- `mqttPort`: `1883` (TCP)
- `printSecret`: chuỗi bí mật, trùng với Web
- Serial: cổng/baud/regex khi kết nối cân thật
- Bật “Simulate Scale” nếu chưa có cân thật

Chạy CLI (headless):
```
python3 weigh_agent_cli.py --simulate --fake-mode sine --fake-hz 0.2
```

--------------------------------------------------------------------------------
## 5) Khởi chạy bằng Docker (Staging/Prod)

Repo này chưa kèm sẵn docker-compose.yml. Bạn có thể dùng mẫu dưới đây để tự tạo `docker-compose.yml` tại thư mục gốc repo:

```yaml
version: "3.9"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: weighuser
      POSTGRES_PASSWORD: weighpass
      POSTGRES_DB: weighing
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  mqtt:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./truck-weighing-station-app/config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - ./truck-weighing-station-app/config/passwd:/mosquitto/config/passwd:ro
      - ./truck-weighing-station-app/data/mosquitto:/mosquitto/data

  backend:
    build: ./web-backend
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: weighuser
      DB_PASSWORD: weighpass
      DB_NAME: weighing
      DB_SYNCHRONIZE: "false" # production nên dùng migration
      JWT_SECRET: your-secret-key
      NODE_ENV: production
    depends_on:
      - db
    ports:
      - "4000:4000"

  frontend:
    build:
      context: ./web-frontend
      dockerfile: Dockerfile.web
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  pgdata:
```

Chạy stack:
```
docker compose up -d --build
```
Dịch vụ & cổng:
- Web (Nginx): http://localhost
- Backend (NestJS): http://localhost:4000
- PostgreSQL: localhost:5432
- MQTT: 1883 (TCP), 9001 (WS)

--------------------------------------------------------------------------------
## 6) Cấu hình Web App

Vào http://localhost (hoặc http://localhost:5173 ở dev), mở Cài đặt:
- Tab “Kết nối PC Cân”
  - Giao thức: `ws` (hoặc `wss` nếu web chạy HTTPS)
  - IP Broker: IP máy chứa Mosquitto
  - Cổng: `9001`
  - Path: `/` (Mosquitto)
  - Machine ID: `weigh1` (trùng với Agent)
- Tab “Máy in”
  - Print Secret: nhập giống `printSecret` trong `weigh-agent/config.json`

Sau khi lưu, web sẽ tự kết nối. Bạn sẽ thấy:
- ONLINE/OFFLINE khi agent lên/xuống
- Realtime weight từ MQTT
- PRINT_OK / PRINT_ERROR sau khi in

--------------------------------------------------------------------------------
## 7) Cấu hình Weigh Agent (nâng cao)

Một số tuỳ chọn hữu ích trong `weigh-agent/config.json` (tham khảo nhanh):
- MQTT:
  - `mqttHost`, `mqttPort`, `mqttUsername`, `mqttPassword`
  - `retainLastReading`, `readingQos`, `statusQos`, `retainStatus`
- In ấn:
  - `printSecret`, `printerName`, `sumatraPath` (Windows)
  - `onlyPrintWhenStable`: chỉ in khi ổn định
- Serial & mô phỏng:
  - `serialPort`, `baudRate`, `serialEncoding`, `serialRegex`, `decimals`
  - `simulateScale`, `fakeMode` (sine|random|saw|step|manual) và các tham số
  - `pollCommand`, `pollIntervalMs` (nếu cân cần lệnh poll)
- Lọc/stability:
  - `scaleFactor`, `scaleOffset`
  - `filterMedianWindow`, `filterThrottleMs`, `filterMinDelta`
  - `stableWindow`, `stableDeltaMax`, `stableStdMax`
- Backend push (tuỳ chọn):
  - `backendUrl`, `backendEventsEndpoint`, `backendEnabled`, `backendMinIntervalMs`, `backendDeltaThreshold`, `backendApiKey`

--------------------------------------------------------------------------------
## 8) Tích hợp Backend (Database & API)

Backend (NestJS + TypeORM + PostgreSQL):
- Chạy dev: `npm run start:dev` (tự reload)
- Build prod: `npm run build` → `npm run start:prod`
- Env quan trọng: `DB_*`, `JWT_SECRET`, `NODE_ENV`, `DB_SYNCHRONIZE`
- Dev mặc định bật logging & synchronize (trừ khi NODE_ENV=production)

Migrations (khuyến nghị production):
```
# Tạo migration mới
npm run migration:generate

# Chạy migration
npm run migration:run

# Revert migration
npm run migration:revert
```

--------------------------------------------------------------------------------
## 9) Kiểm thử end-to-end

1) Đảm bảo Mosquitto mở 1883 & 9001, Backend & PostgreSQL đã chạy
2) Mở Web > Cài đặt > nhập đúng broker WS và machineId
3) Chạy Agent (GUI hoặc CLI) với machineId trùng khớp
4) Mở màn hình cân, tạo phiếu, xem trước, bấm “Gửi in”
5) Quan sát Agent in phiếu và web hiện PRINT_OK/PRINT_ERROR

--------------------------------------------------------------------------------
## 10) Troubleshooting

- Web không kết nối MQTT WS:
  - Kiểm tra Mosquitto đã mở `listener 9001` + `protocol websockets`
  - Dùng đúng Path `/` cho Mosquitto thuần
  - Nếu Web chạy HTTPS → dùng `wss://` và cấu hình SSL cho broker hoặc reverse proxy
- Agent không có Tkinter (Linux):
  - `sudo apt-get install python3-tk`
- Agent không in được (Linux/macOS):
  - `sudo apt-get install cups-bsd` rồi thử `lpstat -p -d`
- In không chạy:
  - Kiểm tra `printSecret` có khớp giữa Web và Agent
- Không có số cân:
  - Kiểm tra COM port/baud/regex đúng định dạng dữ liệu cân
- MQTT có user/pass:
  - Tạo user: `mosquitto_passwd -c ./truck-weighing-station-app/config/passwd youruser`
  - Bật `password_file` trong `mosquitto.conf`
- Backend không kết nối DB:
  - Kiểm tra `.env` các biến `DB_*` và Postgres đang chạy (`docker ps`, `psql`)

--------------------------------------------------------------------------------
## 11) Bảo mật (khuyến nghị production)

- MQTT: bật user/password, tắt `allow_anonymous`, đổi file `passwd`
- WebSocket: dùng WSS (TLS) khi triển khai Internet
- Backend: ẩn `JWT_SECRET`, `.env` không commit; dùng HTTPS/Reverse proxy
- Agent: đặt `printSecret` mạnh; khoá firewall theo IP

--------------------------------------------------------------------------------
## 12) Phụ lục

- Một số port có thể bị chiếm; đổi port trong compose hoặc .env nếu cần
- Ở multi-machine, dùng IP LAN của máy chạy Mosquitto/Backend cho Agent & Web
- Nginx trong image frontend đã reverse proxy `/api/` → `http://weigh-backend:4000` (khi chạy cùng compose network). Trong Dev bạn gọi API trực tiếp qua http://localhost:4000

--------------------------------------------------------------------------------
## License

MIT © Your Team
