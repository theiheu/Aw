# Server Infrastructure (Central Server)

Central server stack for the weighing system: Web UI, Backend API, Database, MQTT Broker, PDF Renderer, and Backups.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Server Infrastructure (Docker Compose)                  │
├─────────────────────────────────────────────────────────┤
│ • Nginx (Web UI)          → Port 80                      │
│ • Backend API             → Port 4000 (internal)         │
│ • PostgreSQL              → Internal only                │
│ • Mosquitto MQTT          → Port 1883 (TCP), 9001 (WS)  │
│ • Gotenberg (PDF)         → Internal only                │
│ • pg-backups              → Automatic daily backups      │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Prerequisites

- Docker + Docker Compose (v2.0+)
- Open firewall ports: **80, 1883, 9001**
- ~2GB disk space for data

### 2. Create Mosquitto Credentials

Generate password file for MQTT users:

```bash
cd server-infra

# Create password file with default user
docker run --rm -v $(pwd)/config:/work eclipse-mosquitto:2 \
  mosquitto_passwd -c /work/passwd weighuser

# Add backend user (optional, for separate credentials)
docker run --rm -v $(pwd)/config:/work eclipse-mosquitto:2 \
  mosquitto_passwd /work/passwd backend

# Add webclient user (optional)
docker run --rm -v $(pwd)/config:/work eclipse-mosquitto:2 \
  mosquitto_passwd /work/passwd webclient
```

**Note:** Replace `weighuser` with your desired username and enter password when prompted.

### 3. Configure Environment

Edit `.env` file with your settings:

```bash
# Critical - change these in production!
DB_PASSWORD=your-secure-db-password
MQTT_PASSWORD=your-secure-mqtt-password
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Optional
TZ=Asia/Ho_Chi_Minh
MQTT_PORT=1883
MQTT_WEBSOCKET_PORT=9001
```

### 4. Start Services

```bash
cd server-infra
docker compose -f docker-compose.server.yml up -d

# Check status
docker compose -f docker-compose.server.yml ps

# View logs
docker compose -f docker-compose.server.yml logs -f
```

### 5. Verify Services

```bash
# Web UI
curl http://localhost/

# Backend health
curl http://localhost:4000/health

# MQTT (using mosquitto_sub)
docker run --rm eclipse-mosquitto:2 \
  mosquitto_sub -h <SERVER_IP> -p 1883 \
  -u weighuser -P weighpass123 \
  -t "weigh/+/status" -C 1
```

## Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (secrets, ports, timezone) |
| `config/mosquitto.conf` | MQTT broker configuration |
| `config/acl` | MQTT topic access control list |
| `config/passwd` | MQTT user credentials (generated) |
| `docker-compose.server.yml` | Docker Compose stack definition |

## Environment Variables

### Database
- `DB_USER` - PostgreSQL username (default: weighuser)
- `DB_PASSWORD` - PostgreSQL password (⚠️ change in production)
- `DB_NAME` - Database name (default: weighing)

### MQTT
- `MQTT_PORT` - TCP port (default: 1883)
- `MQTT_WEBSOCKET_PORT` - WebSocket port (default: 9001)
- `MQTT_USERNAME` - Default user (default: weighuser)
- `MQTT_PASSWORD` - Default password (⚠️ change in production)
- `MQTT_BASE_TOPIC` - Topic prefix (default: weigh)

### Backend
- `BACKEND_PORT` - API port (default: 4000)
- `JWT_SECRET` - JWT signing key (⚠️ change in production, min 32 chars)
- `CORS_ORIGIN` - Allowed origins (comma-separated)
- `LOG_LEVEL` - Log verbosity (debug, info, warn, error)

### System
- `TZ` - Timezone (default: Asia/Ho_Chi_Minh)
- `PG_BACKUP_SCHEDULE` - Cron schedule for backups (default: 0 3 * * * = 3 AM daily)

## MQTT Topics & ACL

### Topic Structure
```
weigh/<machine_id>/scale/<sensor_id>    # Scale readings
weigh/<machine_id>/status               # Machine status
weigh/<machine_id>/print/jobs           # Print job requests
weigh/<machine_id>/print/acks           # Print acknowledgments
```

### User Permissions (config/acl)

| User | Permissions |
|------|-------------|
| `backend` | Write jobs, read acks & status |
| `webclient` | Read scale & status (no write) |
| `weighuser` | Read jobs, write acks & status |

## Data & Backups

### Volumes
- `db_data` - PostgreSQL data
- `mqtt_data` - Mosquitto persistence
- `backups_data` - Automatic backups

### Backup Schedule
- **Default:** Daily at 3:00 AM (UTC+7)
- **Location:** `backups_data/` volume
- **Retention:** Manual cleanup (see below)

### Manual Backup
```bash
docker exec weigh-postgres pg_dump -U weighuser weighing > backup.sql
```

### Restore from Backup
```bash
docker exec -i weigh-postgres psql -U weighuser weighing < backup.sql
```

## Security Checklist

- [ ] Change `DB_PASSWORD` in `.env`
- [ ] Change `MQTT_PASSWORD` in `.env`
- [ ] Change `JWT_SECRET` in `.env` (min 32 characters)
- [ ] Review `config/acl` for your use case
- [ ] Set `CORS_ORIGIN` to your domain
- [ ] Enable firewall (only open 80, 1883, 9001)
- [ ] For Internet exposure: Use reverse proxy with HTTPS (Caddy/Traefik)
- [ ] For Internet MQTT: Enable TLS in mosquitto.conf

## Troubleshooting

### MQTT Connection Failed
```bash
# Check MQTT logs
docker compose -f docker-compose.server.yml logs mqtt

# Test connection
docker run --rm eclipse-mosquitto:2 \
  mosquitto_sub -h <SERVER_IP> -p 1883 \
  -u weighuser -P weighpass123 \
  -t "weigh/+/status" -C 1 -W 5
```

### Database Connection Issues
```bash
# Check DB logs
docker compose -f docker-compose.server.yml logs db

# Connect to database
docker exec -it weigh-postgres psql -U weighuser -d weighing
```

### Backend API Not Responding
```bash
# Check backend logs
docker compose -f docker-compose.server.yml logs backend

# Check health endpoint
curl -v http://localhost:4000/health
```

### Disk Space Issues
```bash
# Check volume sizes
docker volume ls
docker system df

# Clean up old backups (manual)
docker run --rm -v backups_data:/backups alpine \
  find /backups -name "*.sql.gz" -mtime +30 -delete
```

## Maintenance

### Regular Tasks
- [ ] Monitor disk space (backups grow daily)
- [ ] Test restore monthly: `docker exec -i weigh-postgres psql < backup.sql`
- [ ] Review logs weekly: `docker compose logs --tail 100`
- [ ] Update images monthly: `docker compose pull && docker compose up -d`

### Upgrade Services
```bash
# Pull latest images
docker compose -f docker-compose.server.yml pull

# Restart with new images
docker compose -f docker-compose.server.yml up -d

# Check status
docker compose -f docker-compose.server.yml ps
```

## Ports Reference

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Web (Nginx) | 80 | HTTP | Web UI |
| Backend | 4000 | HTTP | API (internal) |
| MQTT | 1883 | TCP | Agents over LAN |
| MQTT | 9001 | WebSocket | Browsers/phones |
| PostgreSQL | 5432 | TCP | Internal only |
| Gotenberg | 3000 | HTTP | PDF rendering (internal) |

## Support

For issues or questions:
1. Check logs: `docker compose logs -f <service_name>`
2. Review `.env` configuration
3. Verify network connectivity: `docker network ls`
4. Check firewall rules

---

**Last Updated:** 2025-12-06
**Version:** 1.0
