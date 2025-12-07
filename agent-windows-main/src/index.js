/*
 Windows Main Agent (CommonJS)
 - Combines Scale Reader (Serial) + Print Handler (PDF) in one Windows service/app
 - Single MQTT client for all topics with LWT status

 Topics (machineId = env MACHINE_ID):
 - weigh/<machineId>/scale/weight   { value, unit, stable, ts }
 - weigh/<machineId>/scale/stable   { value, unit, ts }
 - weigh/<machineId>/print/jobs     { id, ticketId, pdfUrl|pdfBase64, copies, printer }
 - weigh/<machineId>/print/acks     { id, status: printed|error|duplicate, printer, copies, error?, ts }
 - weigh/<machineId>/status         ONLINE|OFFLINE|PRINT_OK|PRINT_ERROR
*/

require('dotenv').config();
const mqtt = require('mqtt');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { print } = require('pdf-to-printer');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { logger: log, DEFAULT_DATA_DIR } = require('./logger');
const Database = require('better-sqlite3');

// ---------- Config ----------

// MQTT
const MQTT_HOST = process.env.MQTT_HOST || '127.0.0.1';
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883', 10);
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
const MQTT_BASE_TOPIC = process.env.MQTT_BASE_TOPIC || 'weigh';
const MACHINE_ID = process.env.MACHINE_ID || 'weigh1';

// Serial (Scale)
const COM_PORT = process.env.COM_PORT || 'COM3';
const BAUD_RATE = parseInt(process.env.BAUD_RATE || process.env.COM_BAUDRATE || '9600', 10);
const DATA_BITS = parseInt(process.env.DATA_BITS || '8', 10);
const PARITY = process.env.PARITY || 'none';
const STOP_BITS = parseInt(process.env.STOP_BITS || '1', 10);
const UNIT = process.env.UNIT || 'kg';
const WINDOW_SIZE = parseInt(process.env.WINDOW_SIZE || '10', 10);
const STABLE_STD_MAX = parseFloat(process.env.STABLE_STD_MAX || '5');
const STABLE_MIN_DURATION = parseInt(process.env.STABLE_MIN_DURATION || '1000', 10);

// Print
const PRINTER_NAME = process.env.PRINTER_NAME || undefined;
const COPIES_DEFAULT = parseInt(process.env.COPIES || '1', 10);
const DOWNLOAD_TIMEOUT = parseInt(process.env.DOWNLOAD_TIMEOUT || '15000', 10);

// Topics
const RAW_TOPIC = `${MQTT_BASE_TOPIC}/${MACHINE_ID}/scale/weight`;
const STABLE_TOPIC = `${MQTT_BASE_TOPIC}/${MACHINE_ID}/scale/stable`;
const JOBS_TOPIC = `${MQTT_BASE_TOPIC}/${MACHINE_ID}/print/jobs`;
const ACKS_TOPIC = `${MQTT_BASE_TOPIC}/${MACHINE_ID}/print/acks`;
const STATUS_TOPIC = `${MQTT_BASE_TOPIC}/${MACHINE_ID}/status`;

// ---------- Helpers ----------
function mean(arr) { return arr.reduce((a,b)=>a+b,0) / (arr.length || 1); }
function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = mean(arr.map(x => (x - m) ** 2));
  return Math.sqrt(v);
}

function parseWeightLine(line) {
  const trimmed = (line || '').trim();
  const norm = trimmed.replace(/,/g, '.');
  const match = norm.match(/(-?\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!isFinite(value)) return null;
  return { value, unit: UNIT };
}

function publish(client, topic, payload) {
  try {
    client.publish(topic, JSON.stringify(payload), { qos: 1 });
  } catch(e) {
    log.error('Publish error', topic, e.message || e);
  }
}

const fetchLib = (typeof fetch !== 'undefined') ? fetch : (...args) => import('node-fetch').then(({default: f}) => f(...args));

async function downloadPdfToTemp(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);
  try {
    const res = await fetchLib(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const buf = await res.arrayBuffer();
    const filePath = path.join(os.tmpdir(), `weigh-ticket-${Date.now()}.pdf`);
    fs.writeFileSync(filePath, Buffer.from(buf));
    return filePath;
  } finally {
    clearTimeout(t);
  }
}

async function savePdfBase64ToTemp(b64) {
  const filePath = path.join(os.tmpdir(), `weigh-ticket-${Date.now()}.pdf`);
  fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
  return filePath;
}

// ---------- State + Persistence ----------
const PRINT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const printedSet = new Map(); // jobId -> ts (recent window)

// SQLite persistence to prevent duplicates after reboot
const DB_PATH = process.env.DB_PATH || path.join(DEFAULT_DATA_DIR, 'agent.db');
try { fs.mkdirSync(path.dirname(DB_PATH), { recursive: true }); } catch {}
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS printed_jobs (
    id TEXT PRIMARY KEY,
    printed_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_printed_at ON printed_jobs(printed_at);
`);

function loadRecentPrintedIntoCache() {
  const cutoff = Date.now() - PRINT_TTL_MS;
  const rows = db.prepare('SELECT id, printed_at FROM printed_jobs WHERE printed_at > ?').all(cutoff);
  for (const r of rows) printedSet.set(r.id, r.printed_at);
  log.info(`Loaded ${rows.length} recent printed job ids into cache`);
}

function hasPrintedRecently(jobId) {
  const now = Date.now();
  const ts = printedSet.get(jobId);
  if (ts && now - ts <= PRINT_TTL_MS) return true;
  const row = db.prepare('SELECT printed_at FROM printed_jobs WHERE id = ?').get(jobId);
  return !!(row && now - row.printed_at <= PRINT_TTL_MS);
}

function markPrinted(jobId) {
  const now = Date.now();
  printedSet.set(jobId, now);
  try { db.prepare('INSERT OR REPLACE INTO printed_jobs (id, printed_at) VALUES (?, ?)').run(jobId, now); } catch {}
}

function pruneOldPrinted() {
  try { db.prepare('DELETE FROM printed_jobs WHERE printed_at <= ?').run(Date.now() - PRINT_TTL_MS); } catch {}
}

setInterval(() => {
  const now = Date.now();
  for (const [k, ts] of printedSet.entries()) if (now - ts > PRINT_TTL_MS) printedSet.delete(k);
  pruneOldPrinted();
}, 10 * 60 * 1000);

const scaleState = {
  values: [],
  lastStableAt: 0,
  lastStableValue: null,
};

let serialPort = null;
let serialParser = null;
let mqttClient = null;
let shuttingDown = false;

// ---------- Scale pipeline ----------
function handleScaleParsedValue(client, val) {
  const now = Date.now();
  scaleState.values.push(val);
  if (scaleState.values.length > WINDOW_SIZE) scaleState.values.shift();

  const sigma = stddev(scaleState.values);
  const rawPayload = { value: val, unit: UNIT, stable: sigma <= STABLE_STD_MAX, ts: new Date().toISOString() };
  publish(client, RAW_TOPIC, rawPayload);

  if (sigma <= STABLE_STD_MAX) {
    if (scaleState.lastStableAt === 0) scaleState.lastStableAt = now;
    if (now - scaleState.lastStableAt >= STABLE_MIN_DURATION) {
      if (scaleState.lastStableValue === null || Math.abs(scaleState.lastStableValue - val) > 0.5) {
        scaleState.lastStableValue = val;
        publish(client, STABLE_TOPIC, { value: val, unit: UNIT, ts: new Date().toISOString() });
        log.info('Stable weight:', val, UNIT);
      }
    }
  } else {
    scaleState.lastStableAt = 0;
  }
}

function startSerial(client) {
  try {
    serialPort = new SerialPort({ path: COM_PORT, baudRate: BAUD_RATE, dataBits: DATA_BITS, parity: PARITY, stopBits: STOP_BITS, autoOpen: true });
    serialParser = serialPort.pipe(new ReadlineParser({ delimiter: /\r?\n/ }));

    serialPort.on('open', () => log.info('Serial opened', COM_PORT));
    serialPort.on('error', (e) => log.error('Serial error:', e?.message || e));
    serialPort.on('close', () => log.warn('Serial closed'));

    serialParser.on('data', (line) => {
      log.debug('SERIAL RX:', line);
      const parsed = parseWeightLine(line);
      if (!parsed) return;
      handleScaleParsedValue(client, parsed.value);
    });
  } catch (e) {
    log.error('Serial init failed:', e?.message || e);
  }
}

// ---------- Print pipeline ----------
async function handlePrintJob(client, jobRaw) {
  let job;
  try {
    job = typeof jobRaw === 'string' ? JSON.parse(jobRaw) : jobRaw;
  } catch (e) {
    log.error('Invalid job payload');
    return;
  }

  const jobId = job.id || `${Date.now()}`;
  if (hasPrintedRecently(jobId)) {
    publish(client, ACKS_TOPIC, { id: jobId, status: 'duplicate' });
    return;
  }

  let pdfFile = null;
  try {
    if (job.pdfBase64) pdfFile = await savePdfBase64ToTemp(job.pdfBase64);
    else if (job.pdfUrl) pdfFile = await downloadPdfToTemp(job.pdfUrl);
    else throw new Error('Job missing pdfUrl/pdfBase64');

    const copies = Number(job.copies || COPIES_DEFAULT || 1);
    const printer = job.printer || PRINTER_NAME;

    const opts = { printer, copies, win32: ['-print-settings', `copies=${copies}`] };
    log.info(`Printing ${jobId} -> printer=${printer || 'default'} copies=${copies}`);
    await print(pdfFile, opts);

    markPrinted(jobId);
    publish(client, ACKS_TOPIC, { id: jobId, status: 'printed', printer: printer || 'default', copies, ts: new Date().toISOString() });
    publish(client, STATUS_TOPIC, { status: 'PRINT_OK', jobId, ticketId: job.ticketId });
  } catch (err) {
    const msg = String(err?.message || err);
    log.error('Print failed:', msg);
    publish(client, ACKS_TOPIC, { id: jobId, status: 'error', error: msg, ts: new Date().toISOString() });
    publish(client, STATUS_TOPIC, { status: 'PRINT_ERROR', jobId, error: msg, ticketId: job.ticketId });
  } finally {
    if (pdfFile) {
      try { fs.unlinkSync(pdfFile); } catch {}
    }
  }
}

// ---------- MQTT client ----------
function buildMqttClient() {
  const brokerUrl = `mqtt://${MQTT_HOST}:${MQTT_PORT}`;
  const willPayload = JSON.stringify({ status: 'OFFLINE', machineId: MACHINE_ID, ts: new Date().toISOString() });
  const options = {
    clientId: `win-main-agent-${MACHINE_ID}-${Math.random().toString(16).slice(2)}`,
    username: MQTT_USERNAME || undefined,
    password: MQTT_PASSWORD || undefined,
    clean: true,
    reconnectPeriod: 2000,
    protocolVersion: 4,
    will: {
      topic: STATUS_TOPIC,
      payload: willPayload,
      qos: 1,
      retain: false,
    },
  };

  const client = mqtt.connect(brokerUrl, options);
  client.on('connect', () => {
    log.info('MQTT connected');
    publish(client, STATUS_TOPIC, { status: 'ONLINE', machineId: MACHINE_ID, ts: new Date().toISOString() });
    client.subscribe(JOBS_TOPIC, { qos: 1 }, (err) => {
      if (err) log.error('Subscribe error:', err?.message || err);
      else log.info('Subscribed', JOBS_TOPIC);
    });
  });
  client.on('reconnect', () => log.info('MQTT reconnecting...'));
  client.on('error', (e) => log.error('MQTT error:', e?.message || e));
  client.on('close', () => log.warn('MQTT closed'));

  client.on('message', async (topic, payload) => {
    try {
      if (topic === JOBS_TOPIC) {
        await handlePrintJob(client, payload.toString());
      }
    } catch (e) {
      log.error('Message handling error:', e?.message || e);
    }
  });

  return client;
}

// ---------- Main ----------
async function main() {
  loadRecentPrintedIntoCache();
  log.info('Agent data dir:', DEFAULT_DATA_DIR);
  mqttClient = buildMqttClient();
  startSerial(mqttClient);

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info('Shutting down due to', signal);
    try { publish(mqttClient, STATUS_TOPIC, { status: 'OFFLINE', machineId: MACHINE_ID, ts: new Date().toISOString() }); } catch {}
    try { mqttClient?.end(true); } catch {}
    try { serialParser?.removeAllListeners(); } catch {}
    try { serialPort?.close(); } catch {}
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((e) => {
  log.error('Fatal:', e?.message || e);
  process.exit(1);
});

