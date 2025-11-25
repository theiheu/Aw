# Truck Weighing Station - Multi-Folder Docker Setup

Hướng dẫn chạy toàn bộ hệ thống bằng Docker cho 3 thư mục:
- truck-weighing-station-app (Frontend + Orchestrator Compose)
- weighing-backend (Backend API)
- weigh-agent (Agent đọc cân & in phiếu – dành cho Windows)

Cấu trúc thư mục khuyến nghị (3 thư mục nằm cùng cấp):

/projects
- truck-weighing-station-app/
- weighing-backend/
- weigh-agent/

Lưu ý: docker-compose chính đặt tại truck-weighing-station-app và đã được cấu hình trỏ tới thư mục weighing-backend ở cấp ngang hàng.

--------------------------------------------------------------------------------
Yêu cầu hệ thống
--------------------------------------------------------------------------------
- Docker >= 20.10
- Docker Compose (docker compose v2 hoặc docker-compose v1)
- Ports trống: 80 (web), 4000 (backend), 5432 (Postgres), 1883 (MQTT)

Kiểm tra nhanh:
- docker --version
- docker compose version  (hoặc docker-compose --version)

--------------------------------------------------------------------------------
1) Chuẩn bị cấu hình
--------------------------------------------------------------------------------
Trong truck-weighing-station-app/config:
- backend.env: cấu hình Backend (DB, MQTT, JWT, CORS)
- web.env: cấu hình Frontend (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL)
- mosquitto.conf và passwd: cấu hình MQTT Broker (Eclipse Mosquitto)

Mặc định đã có sẵn các file này. Điều chỉnh nếu cần, ví dụ:
- config/backend.env → CORS_ORIGIN, JWT_SECRET, DB_PASSWORD, MQTT_PASSWORD
- config/web.env → NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL

--------------------------------------------------------------------------------
2) Chạy toàn bộ stack bằng Docker Compose (khuyến nghị)
--------------------------------------------------------------------------------
Chạy tất cả: Frontend + Backend + PostgreSQL + MQTT

cd truck-weighing-station-app
# Docker Compose v2
docker compose up -d
# hoặc (Compose v1)
docker-compose up -d

Kiểm tra:
- docker compose ps  (hoặc docker-compose ps)
- Truy cập: http://localhost

Dịch vụ và cổng:
- Frontend (Nginx serve React build): http://localhost (port 80)
- Backend API (Node): http://localhost:4000
- PostgreSQL: localhost:5432 (user: weighuser, db: weighing)
- MQTT Broker (Mosquitto): localhost:1883 (user: weighuser)

Xem log:
- docker compose logs -f            # tất cả
- docker compose logs -f backend    # từng service

Dừng/Reset:
- docker compose down               # dừng
- docker compose down -v            # dừng & xoá volumes (reset DB)

Lưu ý về đường dẫn:
- File docker-compose.yml đã được cập nhật để build backend từ thư mục ../weighing-backend
- Volumes hot-reload code backend: ../weighing-backend/src:/app/src

--------------------------------------------------------------------------------
3) Chạy riêng lẻ từng folder bằng Docker
--------------------------------------------------------------------------------
A. Frontend (truck-weighing-station-app)
- Build image và chạy container Nginx serve static build

cd truck-weighing-station-app
# Build (sẽ chạy npm ci & vite build trong stage builder)
docker build -f Dockerfile.web -t weigh-web:latest .

# Run (serve build qua Nginx port 80)
docker run --rm -p 80:80 --name weigh-web weigh-web:latest

Ghi chú:
- NEXT_PUBLIC_* trong React được “bake” vào lúc build. Nếu đổi API URL, hãy cập nhật config/web.env và build lại image.

B. Backend (weighing-backend)
- Build image và chạy API (cần DB & MQTT đã chạy sẵn hoặc trỏ tới docker network tương ứng)

cd weighing-backend

docker build -t weigh-backend:latest .

# Chạy đơn lẻ (ví dụ trỏ tới DB/MQTT đang chạy ở host hoặc compose khác)
# Thay các biến phù hợp môi trường của bạn
docker run --rm -p 4000:4000 \
  --env-file ../truck-weighing-station-app/config/backend.env \
  --name weigh-backend weigh-backend:latest

Ghi chú:
- Khi chạy qua compose ở bước (2), bạn không cần run riêng backend.
- File Dockerfile của backend dùng 2 stage (build + production) và chạy dist/main.

C. Agent (weigh-agent) – Windows-only
- Agent sử dụng pywin32 và truy cập COM + máy in Windows; vì vậy:
  - Chạy native Windows (khuyến nghị) hoặc
  - Chạy Docker Windows container (yêu cầu Windows 10/11/Server với Windows containers)
- Không thể chạy container Windows song song với Linux containers trong cùng 1 docker engine; nếu cần, tách môi trường hoặc sử dụng 2 máy/VM riêng.

Chạy native (đơn giản nhất trên máy Windows có COM + máy in):
- Cài Python 3.11 (Windows)
- cd weigh-agent
- python -m venv .venv && .venv\Scripts\activate
- pip install -r requirements.txt
- Chỉnh weigh-agent/config.json (COM port, MQTT host, printer_name…)
- python agent.py

Chạy bằng Docker Windows (tham khảo – chỉ trên Windows containers):
- Tạo weigh-agent/Dockerfile.windows (ví dụ):
  FROM mcr.microsoft.com/windows/servercore:ltsc2022
  SHELL ["cmd", "/S", "/C"]
  # Cài Python (hoặc dùng image Có sẵn python cho windows)
  # Cài đặt gói & copy mã nguồn, tương tự linux nhưng phù hợp Windows
  # pywin32 yêu cầu Windows base image

- Tạo weigh-agent/docker-compose.windows.yml (ví dụ):
  services:
    agent:
      image: weigh-agent:win
      build:
        context: .
        dockerfile: Dockerfile.windows
      volumes:
        - ./:C:\\app
      working_dir: C:\\app
      command: ["python", "agent.py"]
      environment:
        - COM_PORT=COM3
      # Mapping tài nguyên COM/Printer phụ thuộc host Windows, cần cấu hình thêm

Khuyến nghị thực tế: Chạy agent native trên máy cân Windows, kết nối tới MQTT của hệ thống.

--------------------------------------------------------------------------------
4) Mạng và cấu hình liên thông
--------------------------------------------------------------------------------
- Compose tạo network: weighing-network
- Backend kết nối tới DB (service: db) và MQTT (service: mqtt) qua hostname nội bộ docker
- Frontend gọi Backend qua NEXT_PUBLIC_API_URL (mặc định http://localhost:4000)

Nếu deploy nhiều máy:
- Sửa config/backend.env: DB_HOST, MQTT_HOST trỏ tới địa chỉ thật
- Sửa config/web.env: NEXT_PUBLIC_API_URL/NEXT_PUBLIC_WS_URL trỏ tới domain API
- Rebuild/restart containers

--------------------------------------------------------------------------------
5) Lệnh hữu ích
--------------------------------------------------------------------------------
- docker compose ps
- docker compose logs -f backend
- docker compose restart backend
- docker compose build
- docker system prune -f (dọn dẹp docker)

PostgreSQL:
- docker compose exec db pg_isready -U weighuser
- docker compose exec db psql -U weighuser -d weighing

MQTT (trong container):
- docker compose exec mqtt mosquitto_sub -h localhost -p 1883 -u weighuser -P weighpass123 -t "weigh/#" -v
- docker compose exec mqtt mosquitto_pub -h localhost -p 1883 -u weighuser -P weighpass123 -t "weigh/test" -m "hello"

--------------------------------------------------------------------------------
6) Troubleshooting nhanh
--------------------------------------------------------------------------------
- Port bị chiếm: đổi cổng trong docker-compose.yml hoặc dừng dịch vụ chiếm cổng
- Backend không kết nối DB/MQTT: kiểm tra biến DB_HOST/MQTT_HOST trong backend.env
- Frontend không gọi được API: kiểm tra NEXT_PUBLIC_API_URL và rebuild web
- MQTT auth fail: đồng bộ user/pass trong mosquitto + backend.env
- Reset dữ liệu DB: docker compose down -v && docker compose up -d

--------------------------------------------------------------------------------
Tài liệu chi tiết trong repo con
--------------------------------------------------------------------------------
- truck-weighing-station-app/SETUP_GUIDE.md
- truck-weighing-station-app/DOCKER_SETUP.md
- truck-weighing-station-app/QUICK_REFERENCE.md
- truck-weighing-station-app/START_HERE.md

Bạn cần tôi tạo thêm docker-compose ở root để gom tất cả thành 1 file duy nhất không? Tôi có thể tạo mẫu cross-project, hoặc tạo biến thể compose cho Windows agent riêng.

