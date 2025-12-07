# Weighing System - Optimization Summary

**Date:** 2025-12-06  
**Phase:** 1 & 2 (Structural Clarity + Secrets & Configuration)  
**Status:** ✅ COMPLETED

---

## 🎯 What Was Done

### Phase 1: Structural Clarity ✅

#### Directory Renaming
```
weighing-infra          → server-infra
weighing-frontend       → web-frontend
weighing-backend        → web-backend
weighing-agents/win-main-agent → agent-windows-main
```

**Benefits:**
- Immediate clarity on component roles
- Easier onboarding for new developers
- Consistent naming convention

#### Documentation
Created comprehensive 1-page READMEs:
- ✅ `server-infra/README.md` - Server setup, configuration, troubleshooting
- ✅ `agent-windows-main/README.md` - Windows agent setup, service management
- ✅ `web-backend/README.md` - API endpoints, database schema, security

**Benefits:**
- Single source of truth for each component
- Quick reference for operations
- Troubleshooting guides included

#### .gitignore & .dockerignore
- ✅ Updated `.gitignore` with all sensitive paths
- ✅ Created `server-infra/.dockerignore`
- ✅ Excluded: .env, logs, data/, backups/, config/passwd

**Benefits:**
- No accidental credential leaks
- Cleaner Docker builds
- Secure by default

---

### Phase 2: Secrets & Configuration ✅

#### Server Infrastructure (.env)
**File:** `server-infra/.env`

```env
# Database
DB_USER=weighuser
DB_PASSWORD=weighpass123          # ⚠️ CHANGE IN PRODUCTION
DB_NAME=weighing

# MQTT
MQTT_USERNAME=weighuser
MQTT_PASSWORD=weighpass123        # ⚠️ CHANGE IN PRODUCTION
MQTT_BASE_TOPIC=weigh

# Backend
JWT_SECRET=your-secret-key        # ⚠️ CHANGE IN PRODUCTION
CORS_ORIGIN=http://localhost

# System
TZ=Asia/Ho_Chi_Minh
PG_BACKUP_SCHEDULE=0 3 * * *      # Daily 3 AM
```

**Benefits:**
- All secrets in one place
- Easy to rotate credentials
- Environment-specific configuration
- Docker Compose loads via `env_file`

#### Docker Compose Updates
**File:** `server-infra/docker-compose.server.yml`

Changes:
- ✅ All services load from `.env` via `env_file`
- ✅ Named volumes instead of bind mounts:
  - `db_data` (PostgreSQL)
  - `mqtt_data` (Mosquitto)
  - `backups_data` (Backups)
- ✅ Updated build contexts to new directory names
- ✅ Healthchecks already in place

**Benefits:**
- Portable volumes (can move between hosts)
- Easier backup/restore
- Cleaner docker-compose file
- No hardcoded paths

#### Mosquitto ACL (Access Control)
**File:** `server-infra/config/acl`

```
# Backend service
user backend
  topic write weigh/+/print/jobs
  topic read  weigh/+/print/acks

# Web clients
user webclient
  topic read weigh/+/scale/#
  topic read weigh/+/status

# Windows agent
user weighuser
  topic write weigh/+/print/acks
  topic read  weigh/+/print/jobs
```

**Benefits:**
- Role-based topic access
- Prevents unauthorized publishing
- Fine-grained security control
- Easy to audit permissions

#### Mosquitto Configuration
**File:** `server-infra/config/mosquitto.conf`

Updates:
- ✅ Added `acl_file` directive
- ✅ Enhanced security settings
- ✅ Protocol version 3.1.1+ only
- ✅ Unique client ID requirement

**Benefits:**
- Enforced access control
- Modern MQTT protocol only
- Better security posture

#### Windows Agent Configuration
**File:** `agent-windows-main/.env`

```env
# Server Connection
MQTT_HOST=192.168.1.100
MQTT_PORT=1883
MQTT_USERNAME=weighuser
MQTT_PASSWORD=weighpass123

# Machine
MACHINE_ID=weigh1
MACHINE_NAME=Weighing Station 1

# Hardware
COM_PORT=COM3
PRINTER_NAME=Generic Printer

# Logging
LOG_LEVEL=info
LOG_DIR=%PROGRAMDATA%\WeighingAgent\logs
```

**Benefits:**
- No hardcoded credentials
- Easy to deploy to multiple machines
- Clear hardware configuration
- Centralized logging path

---

## 📊 Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│ WEIGHING SYSTEM - 2-NODE ARCHITECTURE                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  SERVER (Linux/Docker)                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │ • Web UI (Nginx) - Port 80                       │   │
│  │ • Backend API - Port 4000                        │   │
│  │ • PostgreSQL - Internal                          │   │
│  │ • Mosquitto MQTT - 1883 (TCP), 9001 (WS)        │   │
│  │ • Gotenberg (PDF) - Internal                     │   │
│  │ • pg-backups - Daily 3 AM                        │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↕ MQTT                         │
│  WINDOWS PC (Single Agent)                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │ • agent-windows-main (Node.js Service)           │   │
│  │ • Serial Port → Scale Sensor                     │   │
│  │ • Printer Driver → Receipt Printer               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Improvements

| Item | Before | After |
|------|--------|-------|
| Credentials | Hardcoded in config | `.env` files (git-ignored) |
| MQTT Access | No ACL | Role-based ACL |
| Volumes | Bind mounts | Named volumes |
| Secrets | Scattered | Centralized in `.env` |
| Database | Default password | Configurable |
| JWT | No secret | Configurable secret |

---

## 📋 Checklist - What's Ready

### ✅ Infrastructure
- [x] Directory structure renamed
- [x] `.env` files created (server-infra, agent-windows-main)
- [x] Docker Compose updated with named volumes
- [x] Mosquitto ACL configured
- [x] `.gitignore` updated
- [x] `.dockerignore` created

### ✅ Documentation
- [x] server-infra/README.md (setup, config, troubleshooting)
- [x] agent-windows-main/README.md (setup, service management)
- [x] web-backend/README.md (API, database, security)

### ⏳ Next Phase (Phase 3: Reliability)
- [ ] Backup cleanup container (30-day retention)
- [ ] Windows agent logging (winston rotating files)
- [ ] Windows agent idempotency (SQLite persistence)

### ⏳ Phase 4: Features
- [ ] Backend API implementation (print-jobs, RBAC)
- [ ] Database migrations (Prisma/Knex)
- [ ] Frontend Vite configuration
- [ ] PWA support (optional)

### ⏳ Phase 5: Validation
- [ ] End-to-end flow testing
- [ ] Security audit
- [ ] Performance testing

---

## 🚀 Quick Start (After This Phase)

### 1. Server Setup
```bash
cd server-infra

# Generate MQTT passwords
docker run --rm -v $(pwd)/config:/work eclipse-mosquitto:2 \
  mosquitto_passwd -c /work/passwd weighuser

# Start services
docker compose -f docker-compose.server.yml up -d

# Verify
docker compose -f docker-compose.server.yml ps
```

### 2. Windows Agent Setup
```bash
cd agent-windows-main

# Install dependencies
npm install

# Test connection
npm run test:mqtt

# Install as service
npm run service:install
npm run service:start
```

### 3. Verify Flow
```bash
# Web UI
curl http://localhost/

# Backend health
curl http://localhost:4000/health

# MQTT
docker run --rm eclipse-mosquitto:2 \
  mosquitto_sub -h <SERVER_IP> -p 1883 \
  -u weighuser -P weighpass123 \
  -t "weigh/+/status" -C 1
```

---

## 📝 Important Notes

### ⚠️ BEFORE PRODUCTION

1. **Change all default passwords:**
   - `DB_PASSWORD` in `.env`
   - `MQTT_PASSWORD` in `.env`
   - `JWT_SECRET` in `.env` (min 32 chars)

2. **Regenerate MQTT credentials:**
   ```bash
   docker run --rm -v $(pwd)/config:/work eclipse-mosquitto:2 \
     mosquitto_passwd -c /work/passwd <new_username>
   ```

3. **Update CORS_ORIGIN:**
   - Set to your actual domain
   - Remove localhost entries

4. **Enable HTTPS:**
   - Use reverse proxy (Caddy/Traefik)
   - Enable TLS for MQTT if exposed to internet

5. **Backup strategy:**
   - Test restore monthly
   - Monitor disk space
   - Consider off-site backup

### 📚 File Locations

```
/home/thehi/projects/
├── server-infra/
│   ├── .env                          ← Secrets (git-ignored)
│   ├── config/
│   │   ├── mosquitto.conf            ← MQTT config
│   │   ├── acl                       ← MQTT ACL
│   │   └── passwd                    ← MQTT passwords (git-ignored)
│   ├── docker-compose.server.yml     ← Main compose file
│   └── README.md                     ← Setup guide
├── agent-windows-main/
│   ├── .env                          ← Agent config (git-ignored)
│   └── README.md                     ← Setup guide
├── web-backend/
│   ├── .env                          ← Backend config (git-ignored)
│   └── README.md                     ← API documentation
├── web-frontend/
│   └── README.md                     ← Frontend setup (next phase)
└── .gitignore                        ← Updated with new patterns
```

---

## 🎓 Learning Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Mosquitto ACL Guide](https://mosquitto.org/man/mosquitto_conf-5.html)
- [MQTT Topic Design](https://www.hivemq.com/blog/mqtt-essentials-part-5-mqtt-topics-best-practices/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## 📞 Support

For questions or issues:
1. Check the relevant README.md
2. Review logs: `docker compose logs -f <service>`
3. Verify `.env` configuration
4. Test connectivity with provided commands

---

**Next Steps:** Proceed to Phase 3 (Reliability) when ready.
