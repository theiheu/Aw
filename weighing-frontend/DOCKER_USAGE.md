# Docker Compose Usage Guide

## 📋 Tổng Quan

Dự án sử dụng Docker Compose với 3 cấu hình khác nhau:
- **docker-compose.yml**: Base configuration (chứa tất cả services)
- **docker-compose.dev.yml**: Development overrides
- **docker-compose.prod.yml**: Production overrides

## 🚀 Khởi Động

### Development Environment
```bash
# Khởi động tất cả services với dev config
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Xem logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

# Dừng services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Production Environment
```bash
# Khởi động tất cả services với prod config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Xem logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Dừng services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
```

## 🔧 Cấu Hình Environment Variables

### 1. Tạo .env file từ template
```bash
cp config/.env.example .env
```

### 2. Chỉnh sửa .env file với giá trị của bạn
```bash
# Database
DB_USER=weighuser
DB_PASSWORD=your_secure_password
DB_NAME=weighing

# MQTT
MQTT_USERNAME=weighuser
MQTT_PASSWORD=your_secure_password

# Ports
DB_PORT=5432
MQTT_PORT=1883
BACKEND_PORT=4000
WEB_PORT=80
DEV_PORT=5173
```

## 📦 Services

### MQTT Broker (eclipse-mosquitto:2)
- **Port**: 1883 (MQTT), 9001 (WebSocket)
- **Healthcheck**: Kiểm tra kết nối MQTT
- **Resources**: CPU 0.5, Memory 256MB

### Database (postgres:16-alpine)
- **Port**: 5432
- **Healthcheck**: pg_isready
- **Resources**: CPU 1, Memory 512MB
- **Data Volume**: ./data/postgres

### Backend (Node.js)
- **Port**: 4000
- **Healthcheck**: GET /health
- **Resources**: CPU 1, Memory 512MB
- **Dev**: Có volume mount src code
- **Prod**: Không có volume mount

### Frontend Web (Nginx)
- **Port**: 80
- **Healthcheck**: HTTP GET /
- **Resources**: CPU 0.5, Memory 256MB
- **Chỉ chạy trong production**

### Frontend Dev (Node.js + Vite)
- **Port**: 5173
- **Healthcheck**: HTTP GET /
- **Resources**: CPU 0.5, Memory 256M
- **Chỉ chạy trong development**

### Weigh Agent
- **Port**: 8787 (health)
- **Healthcheck**: GET /health
- **Resources**: CPU 0.25, Memory 128MB
- **Serial Ports**: /dev/ttyUSB0, /dev/ttyACM0

## 🔍 Kiểm Tra Status

```bash
# Xem status tất cả containers
docker-compose ps

# Xem logs của một service cụ thể
docker-compose logs backend -f

# Xem resource usage
docker stats
```

## 🧹 Cleanup

```bash
# Dừng và xóa containers
docker-compose down

# Xóa volumes (cảnh báo: sẽ mất dữ liệu)
docker-compose down -v

# Xóa images
docker-compose down --rmi all
```

## 🔐 Bảo Mật

### Important Security Notes:
1. **Luôn sử dụng .env file** - Không hardcode credentials
2. **Thay đổi default passwords** - Đặc biệt cho production
3. **Giữ .env file private** - Thêm vào .gitignore
4. **Sử dụng secrets management** - Cho production deployment

### Recommended for Production:
- Docker Secrets (Docker Swarm)
- HashiCorp Vault
- AWS Secrets Manager
- Kubernetes Secrets

## 📊 Performance Tuning

### Development
- Reduced resource limits
- Debug logging enabled
- Hot reload enabled
- Fake mode for agent

### Production
- Increased resource limits
- Warning level logging
- Optimized PostgreSQL settings
- Real hardware mode for agent

## [object Object]eshooting

### Container không khởi động
```bash
# Xem chi tiết error
docker-compose logs service_name

# Kiểm tra healthcheck
docker-compose ps
```

### Kết nối database fail
```bash
# Kiểm tra PostgreSQL
docker-compose exec db pg_isready -U weighuser

# Kiểm tra logs
docker-compose logs db
```

### MQTT không kết nối
```bash
# Kiểm tra MQTT broker
docker-compose exec mqtt mosquitto_sub -h localhost -t '$SYS/#'

# Kiểm tra credentials
docker-compose logs mqtt
```

### Port đã được sử dụng
```bash
# Tìm process sử dụng port
lsof -i :5432

# Hoặc thay đổi port trong .env
DB_PORT=5433
```

## 📝 Aliases (Optional)

Thêm vào ~/.bashrc hoặc ~/.zshrc:

```bash
# Development
alias dc-dev='docker-compose -f docker-compose.yml -f docker-compose.dev.yml'

# Production
alias dc-prod='docker-compose -f docker-compose.yml -f docker-compose.prod.yml'

# Usage
# dc-dev up -d
# dc-prod logs -f
```

## 🔄 Updating Services

```bash
# Rebuild images
docker-compose build

# Rebuild specific service
docker-compose build backend

# Pull latest base images
docker-compose pull

# Restart services
docker-compose restart
```

## 📚 Thêm Tài Liệu

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [Eclipse Mosquitto](https://hub.docker.com/_/eclipse-mosquitto)

