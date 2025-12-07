# Backend API

Node.js/Express backend service for the weighing system. Handles print job creation, PDF rendering, MQTT communication, and database operations.

## Architecture

```
┌─────────────────────────────────────────────────┐
│ Backend API (Node.js/Express)                   │
├─────────────────────────────────────────────────┤
│ • REST API (Port 4000)                          │
│ • PostgreSQL (Database)                         │
│ • Mosquitto MQTT (Print jobs)                   │
│ • Gotenberg (PDF rendering)                     │
│ • JWT Authentication                            │
│ • RBAC (Operator/Supervisor/Admin)              │
└─────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js 18+** (LTS recommended)
- **PostgreSQL 14+** (via Docker Compose)
- **Mosquitto MQTT** (via Docker Compose)
- **Gotenberg** (PDF renderer, via Docker Compose)

## Quick Start

### 1. Install Dependencies

```bash
cd web-backend
npm install
```

### 2. Configure Environment

Create `.env` file (or use from server-infra/.env):

```bash
# .env
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=weighuser
DB_PASSWORD=weighpass123
DB_NAME=weighing

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345

# MQTT
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USERNAME=weighuser
MQTT_PASSWORD=weighpass123
MQTT_BASE_TOPIC=weigh

# PDF Renderer
GOTENBERG_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost,http://127.0.0.1
```

### 3. Run Database Migrations

```bash
npm run migrate
```

### 4. Start Service

```bash
# Development
npm run dev

# Production
npm start
```

### 5. Verify API

```bash
curl http://localhost:4000/health
```

## API Endpoints

### Health Check
```
GET /health
Response: { status: "ok", timestamp: "2025-12-06T16:00:00Z" }
```

### Print Jobs

#### Create Print Job
```
POST /api/print-jobs
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "machineId": "weigh1",
  "weight": 125.50,
  "unit": "kg",
  "reference": "REF-001",
  "copies": 1
}

Response:
{
  "jobId": "job-12345",
  "pdfUrl": "http://server/api/print/job-12345.pdf",
  "status": "pending",
  "createdAt": "2025-12-06T16:00:00Z"
}
```

#### Get Print Job Status
```
GET /api/print-jobs/:jobId
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "jobId": "job-12345",
  "machineId": "weigh1",
  "status": "completed",
  "printedAt": "2025-12-06T16:00:05Z",
  "copies": 1
}
```

#### List Print Jobs
```
GET /api/print-jobs?machineId=weigh1&status=completed&limit=10
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "jobs": [...],
  "total": 42,
  "page": 1,
  "limit": 10
}
```

### Authentication

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "operator",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-1",
    "username": "operator",
    "role": "operator"
  }
}
```

#### Verify Token
```
GET /api/auth/verify
Authorization: Bearer <JWT_TOKEN>

Response:
{
  "valid": true,
  "user": { ... }
}
```

## Database Schema

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,  -- operator, supervisor, admin
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Print Jobs
```sql
CREATE TABLE print_jobs (
  id UUID PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  machine_id VARCHAR(255) NOT NULL,
  weight DECIMAL(10, 2),
  unit VARCHAR(10),
  reference VARCHAR(255),
  status VARCHAR(50),  -- pending, printing, completed, failed
  copies INT DEFAULT 1,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  printed_at TIMESTAMP,
  created_by UUID REFERENCES users(id)
);
```

### Audit Log
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  resource VARCHAR(255),
  resource_id VARCHAR(255),
  user_id UUID REFERENCES users(id),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## MQTT Integration

### Publish (Backend → Agent)
```
Topic: weigh/<machine_id>/print/jobs
Payload:
{
  "jobId": "job-12345",
  "pdfUrl": "http://server/api/print/job-12345.pdf",
  "copies": 1,
  "timestamp": "2025-12-06T16:00:00Z"
}
```

### Subscribe (Agent → Backend)
```
Topic: weigh/<machine_id>/print/acks
Payload:
{
  "jobId": "job-12345",
  "status": "success",  -- success, failed
  "timestamp": "2025-12-06T16:00:05Z"
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | production | Environment mode |
| `PORT` | 4000 | API port |
| `LOG_LEVEL` | info | Log verbosity |
| `DB_HOST` | localhost | Database host |
| `DB_PORT` | 5432 | Database port |
| `DB_USER` | weighuser | Database user |
| `DB_PASSWORD` | weighpass123 | Database password |
| `DB_NAME` | weighing | Database name |
| `JWT_SECRET` | (required) | JWT signing key |
| `JWT_EXPIRY` | 24h | Token expiration |
| `MQTT_HOST` | localhost | MQTT broker host |
| `MQTT_PORT` | 1883 | MQTT port |
| `MQTT_USERNAME` | weighuser | MQTT user |
| `MQTT_PASSWORD` | weighpass123 | MQTT password |
| `GOTENBERG_URL` | http://localhost:3000 | PDF renderer URL |
| `CORS_ORIGIN` | http://localhost | Allowed origins |

## Development

### Scripts

```bash
npm run dev              # Development with auto-reload
npm start               # Production mode
npm run migrate         # Run database migrations
npm run seed            # Seed database with test data
npm run test            # Run tests
npm run lint            # Run linter
npm run build           # Build for production
```

### Project Structure

```
web-backend/
├── src/
│   ├── index.js                 # Entry point
│   ├── config/
│   │   ├── database.js          # Database connection
│   │   ├── mqtt.js              # MQTT client
│   │   └── logger.js            # Logging
│   ├── routes/
│   │   ├── auth.js              # Authentication endpoints
│   │   ├── print-jobs.js        # Print job endpoints
│   │   └── health.js            # Health check
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   ├── rbac.js              # Role-based access control
│   │   └── error.js             # Error handling
│   ├── services/
│   │   ├── print-job.js         # Print job logic
│   │   ├── pdf.js               # PDF generation
│   │   ├── mqtt.js              # MQTT operations
│   │   └── audit.js             # Audit logging
│   └── models/
│       ├── user.js
│       ├── print-job.js
│       └── audit-log.js
├── migrations/
├── seeds/
├── .env
├── package.json
└── README.md
```

## Security

### Authentication
- JWT-based authentication
- Token expiration: 24 hours
- Refresh token support (optional)

### Authorization
- Role-based access control (RBAC)
- Roles: operator, supervisor, admin
- Resource-level permissions

### Data Protection
- Password hashing (bcrypt)
- SQL injection prevention (parameterized queries)
- CORS enabled (configurable)
- Rate limiting (optional)

### Audit Trail
- All print jobs logged
- User actions tracked
- Timestamps recorded

## Troubleshooting

### Database Connection Failed

```bash
# Check database is running
docker compose -f ../server-infra/docker-compose.server.yml ps db

# Test connection
npm run test:db

# View logs
npm run dev
```

### MQTT Connection Failed

```bash
# Check MQTT broker
docker compose -f ../server-infra/docker-compose.server.yml ps mqtt

# Test connection
npm run test:mqtt
```

### PDF Generation Failed

```bash
# Check Gotenberg
docker compose -f ../server-infra/docker-compose.server.yml ps gotenberg

# Test PDF generation
npm run test:pdf
```

## Performance

### Optimization Tips
- Use connection pooling for database
- Cache frequently accessed data
- Implement request rate limiting
- Monitor response times
- Use async/await for I/O operations

### Monitoring
```bash
# View API logs
npm run dev

# Monitor database
docker exec weigh-postgres psql -U weighuser -d weighing -c "SELECT * FROM pg_stat_statements;"

# Monitor MQTT
docker compose logs mqtt
```

## Deployment

### Docker Build
```bash
docker build -t weigh-backend:latest .
```

### Environment for Production
```bash
NODE_ENV=production
JWT_SECRET=<generate-strong-secret>
DB_PASSWORD=<strong-password>
MQTT_PASSWORD=<strong-password>
CORS_ORIGIN=https://yourdomain.com
```

---

**Last Updated:** 2025-12-06
**Version:** 1.0
**Node.js:** 18+ required
