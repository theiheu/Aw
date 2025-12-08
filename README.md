# Truck Weighing Station — Full Setup Guide

Tài liệu này hướng dẫn bạn khởi chạy toàn bộ hệ thống gồm:
- weighing-frontend (Web App + Docker Compose Orchestrator)
- weighing-backend (REST API)
- weigh-agent (Ứng dụng PC trung tâm kết nối cân & in phiếu)
- MQTT Broker (Mosquitto)
- PostgreSQL (Database)

Bạn có thể chạy nhanh với Docker Compose hoặc chạy từng phần trong môi trường phát triển.

---
## 1) Kiến trúc tổng quan

- PC trung tâm (weigh-agent):
  - Đọc số cân từ cổng COM (serial)
  - Kết nối tới MQTT (TCP 1883)
  - Nhận lệnh in từ Web qua MQTT và in ra máy in nội bộ
  - Có thể (tùy chọn) đẩy dữ liệu cân lên Backend qua HTTP
- Web App (weighing-frontend):
  - Kết nối tới MQTT WebSocket (WS 9001) để hiển thị số cân realtime
  - Tạo phiếu cân, xem trước, gửi lệnh in tới PC trung tâm
  - Gọi Backend API để lưu trữ dữ liệu (nếu dùng)
- Backend (weighing-backend):
  - Cung cấp REST API cho Web App
  - Kết nối PostgreSQL để lưu dữ liệu
- MQTT Broker (Mosquitto):
  - Mở TCP 1883 cho Agent
  - Mở WebSocket 9001 cho Web App

Topic sử dụng (ví dụ với machineId = weigh1):
- Agent publish cân: `weigh/weigh1/reading`
- Agent publish trạng thái: `weigh/weigh1/status` (ONLINE, OFFLINE, PRINT_OK, PRINT_ERROR)
- Web publish lệnh in: `weigh/weigh1/print` (payload gồm pdfBase64 | pdfUrl + secret)

---
## 2) Chuẩn bị thư mục

Đặt 3 thư mục ở cùng cấp (khuyến nghị):

```
/projects
  ├─ weighing-frontend/
  ├─ weighing-backend/
  └─ weigh-agent/
```

Docker Compose chính được đặt trong `weighing-frontend/` và đã trỏ tới thư mục `../weighing-backend`.

---
## 3) Yêu cầu hệ thống

- Docker >= 20.10 và Docker Compose (v2 recommended)
- Mở được các cổng:
  - 80 (Web), 4000 (Backend), 5432 (Postgres), 1883 (MQTT TCP), 9001 (MQTT WS)
- Nếu chạy Dev Mode (không Docker): Node.js LTS, npm, Python 3 (cho Agent), Tkinter (Linux)

Kiểm tra nhanh:
```
docker --version
docker compose version
```

---
## 4) Cấu hình MQTT WebSocket (BẮT BUỘC cho Web)

File: `weighing-frontend/config/mosquitto.conf`

Mặc định file này mới chỉ mở TCP 1883. Bạn cần mở thêm WebSocket 9001 cho frontend. Thêm 2 dòng sau vào cuối file:

```
listener 9001
protocol websockets
```

Sau đó, mở port 9001 trong Docker Compose:
- File: `weighing-frontend/docker-compose.yml`
- Service `mqtt` -> `ports`: thêm dòng `"9001:9001"`

Ví dụ:
```
services:
  mqtt:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro
      - ./config/passwd:/mosquitto/config/passwd:ro
      - ./data/mosquitto:/mosquitto/data
    ...
```

Lưu ý:
- Path WebSocket: nhiều broker cần reverse proxy để có path `/mqtt`. Ở frontend, bạn có thể đặt Path là `/mqtt` (EMQX/RabbitMQ) hoặc `/` (Mosquitto). Hãy cấu hình khớp trong trang Cài đặt.

---
## 5) Khởi chạy toàn bộ stack bằng Docker Compose

Tại thư mục `weighing-frontend/`:

```
docker compose up -d --build
```

Dịch vụ & cổng:
- Web (React build + Nginx): http://localhost
- Backend (Node): http://localhost:4000
- PostgreSQL: localhost:5432 (user: weighuser, pass: weighpass, db: weighing)
- MQTT: TCP 1883, WebSocket 9001

Kiểm tra log:
```
docker compose ps
docker compose logs -f            # tất cả
docker compose logs -f mqtt       # MQTT
docker compose logs -f backend    # Backend
```

Dừng/Reset:
```
docker compose down               # dừng
docker compose down -v            # dừng & xoá volumes (reset DB)
```

---
## 6) Cấu hình trong Web App

Mở http://localhost, vào Cài đặt:

- Tab “Kết nối PC Cân”
  - Giao thức: `ws` (hoặc `wss` nếu web chạy HTTPS)
  - IP Broker: `localhost` (hoặc IP máy chạy Docker)
  - Cổng: `9001`
  - Path: `/mqtt` (nếu broker hỗ trợ) hoặc `/` (Mosquitto)
  - Mã trạm cân (machineId): `weigh1` (hoặc ID bạn dùng trong Agent)
- Tab “Máy in”
  - Print Secret: nhập giống `printSecret` trong `weigh-agent/config.json`

Sau khi lưu, web sẽ tự kết nối. Bạn sẽ thấy thông báo (toast):
- Kết nối PC trung tâm thành công / đang kết nối lại
- ONLINE / OFFLINE khi agent lên/xuống
- PRINT_OK / PRINT_ERROR sau khi in

---
## 7) Chạy Agent (PC Trung tâm)

- Windows:
  - Cài Python 3
  - `pip install pyserial paho-mqtt requests`
  - Chạy: `python weigh_agent_gui.py`
- Ubuntu/Debian:
  - `sudo apt-get install python3-tk`
  - `pip3 install pyserial paho-mqtt requests`
  - `python3 weigh_agent_gui.py`

Cấu hình trong GUI (hoặc `weigh-agent/config.json`):
- `machineId`: trùng với Web (ví dụ `weigh1`)
- `mqttHost`: IP broker (VD `127.0.0.1` nếu broker cùng máy)
- `mqttPort`: `1883` (TCP)
- `printSecret`: trùng khớp với Web
- COM port, baudrate: phù hợp cân thực tế

Agent sẽ:
- Publish cân: `weigh/{machineId}/reading`
- Publish trạng thái: `weigh/{machineId}/status` (ONLINE, OFFLINE, PRINT_OK, PRINT_ERROR)
- Subscribe lệnh in: `weigh/{machineId}/print` (nhận pdfBase64/pdfUrl + secret)
- (Tuỳ chọn) Push backend: cấu hình `backendUrl` và `backendEventsEndpoint`


### 7.1 GUI (khuyến nghị cho người dùng)
- Chạy: `python3 weigh_agent_gui.py`
- Các trường quan trọng:
  - Machine ID: trùng với Web
  - MQTT Host/Port: broker TCP 1883
  - Print Secret: trùng Web
  - Serial Port/Baud/Regex: khi dùng cân thật
  - Simulate Scale: bật để mô phỏng số cân
- Test in nhanh: nút “Test Print PDF” chọn một file PDF để gửi tới máy in mặc định.

### 7.2 CLI (không cần GUI)
- Chạy: `python3 weigh_agent_cli.py [--simulate] [--fake-mode=sine|random|saw|step|manual] [--fake-min ... --fake-max ... --fake-hz ... --fake-noise ... --fake-step ... --manual ...]`
- Ví dụ mô phỏng sine:
  - `python3 weigh_agent_cli.py --simulate --fake-mode sine --fake-hz 0.2`
- Khi chạy CLI, có thể nhập lệnh tương tác:
  - `set 15000` đặt cân thủ công (manual mode)
  - `+ 100` tăng 100, `- 50` giảm 50
  - `mode step` chuyển mode mô phỏng
  - `quit` thoát

### 7.3 Fake Mode (mô phỏng số cân)
- Bật “Simulate Scale” để thay thế đọc COM bằng mô phỏng
- Các mode:
  - sine: dao động hình sin trong khoảng fakeMin–fakeMax, có nhiễu fakeNoise
  - random: số ngẫu nhiên trong khoảng fakeMin–fakeMax
  - saw: dạng răng cưa tăng dần theo chu kỳ
  - step: nhảy bậc với fakeStep
  - manual: đặt số cân thủ công bằng ô “Manual Weight” (GUI) hoặc lệnh `set` (CLI)
- Tham số trong config.json: fakeMode, fakeMin, fakeMax, fakeHz, fakeNoise, fakeStep, fakeManualWeight

### 7.4 Đẩy dữ liệu lên Backend (tuỳ chọn)
- Cấu hình trong weigh-agent/config.json:
  - backendUrl (vd: "http://localhost:4000")
  - backendEventsEndpoint (vd: "/api/events")
  - backendEnabled: true/false (mặc định false)
  - backendMinIntervalMs: tối thiểu thời gian giữa 2 lần gửi reading
  - backendDeltaThreshold: chỉ gửi nếu thay đổi > ngưỡng này (để giảm spam)
- Agent sẽ gửi các sự kiện dạng JSON tới `${backendUrl}${backendEventsEndpoint}`:
  - { type: "reading", weight, machineId, timestamp }
  - { type: "status", status: ONLINE|OFFLINE|PRINT_OK|PRINT_ERROR, machineId, timestamp }
  - { type: "print", result: OK|ERROR, machineId, timestamp }
- Có retry với backoff nếu lỗi; hàng đợi nội bộ giới hạn 1000 sự kiện.

### 7.5 Đóng gói cài đặt (PyInstaller)
- Cài công cụ build: `pip install -r dev-requirements.txt`
- Build GUI app (không console):
  - `pyinstaller -y pyinstaller_gui.spec`
  - File chạy nằm trong `dist/weigh-agent-gui/`
- Ghi chú hệ điều hành:
  - Windows: nên cài PDF reader (SumatraPDF/Adobe) để in PDF bằng ShellExecute.
  - Linux: cần CUPS (lp/lpr). Đã cài qua `cups-bsd`.
- Chạy kèm `config.json` cùng thư mục exe để cấu hình nhanh.

---
## 8) Kiểm thử nhanh end-to-end

1) Đảm bảo MQTT đã mở TCP 1883 & WS 9001, Web & Backend đã chạy.
2) Mở Web > Cài đặt > Kết nối PC Cân, nhập đúng broker WS.
3) Chạy Agent và cấu hình `machineId`, `mqttHost`, `mqttPort`.
4) Mở phiếu cân > Xem trước > chọn “PC Chính” > “Gửi in”.
5) Quan sát Agent in phiếu và Web hiện toast PRINT_OK / PRINT_ERROR.

---
## 9) Chạy Dev Mode (tuỳ chọn)

### 9.1 Web (weighing-frontend)
```
cd weighing-frontend
npm ci
npm run dev
# Mặc định: http://localhost:5173
```
Bạn vẫn cần MQTT WS → có thể chạy riêng Mosquitto bằng Docker:
```
docker run -it --rm \
  -p 1883:1883 -p 9001:9001 \
  -v $PWD/config/mosquitto.conf:/mosquitto/config/mosquitto.conf:ro \
  -v $PWD/config/passwd:/mosquitto/config/passwd:ro \
  -v $PWD/data/mosquitto:/mosquitto/data \
  eclipse-mosquitto:2
```

### 9.2 Backend (weighing-backend)
```
cd weighing-backend
npm ci
npm run dev
# Mặc định: http://localhost:4000
```

### 9.3 Agent (weigh-agent)
Xem mục 7.

---
## 10) Troubleshooting

- Không kết nối được MQTT từ Web:
  - Web chạy HTTPS → phải dùng `wss://` và broker cần SSL / reverse proxy.
  - Sai Path WebSocket → thử `/mqtt` hoặc `/` tùy broker.
  - Chưa mở port 9001 trong docker-compose.
- Agent báo thiếu Tkinter (Linux): `sudo apt-get install python3-tk`.
- In trên Linux/macOS lỗi: cài `lp` hoặc `lpr` (CUPS) và thử lại.
- Lệnh in không chạy: kiểm tra `printSecret` giữa Web và Agent có khớp không.
- Không nhận được số cân: kiểm tra COM port/baudrate và định dạng dữ liệu cân.
- machineId không khớp: Web & Agent phải dùng cùng `machineId`.

---
## 11) Bảo mật (khuyến nghị)

- MQTT: bật user/password (đã có `config/passwd`) và cấu hình lại frontend/agent.
- WebSocket (Production): dùng WSS với chứng chỉ hợp lệ, tránh Mixed Content.
- Print Secret: luôn đặt chuỗi bí mật mạnh cho `printSecret`.

---
## 12) Ghi chú thêm

- Trong `weigh-agent`, đã có Last Will: OFFLINE khi agent disconnect.
- Agent có thể (tùy chọn) gửi dữ liệu cân về Backend qua HTTP (cấu hình `backendUrl`).
- Web đã hiển thị toast cho các trạng thái kết nối/print.

---
## License

MIT © Your Team
