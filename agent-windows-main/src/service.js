// Windows service installer for the combined main agent (Scale + Print)
// Usage:
//  node src/service.js install
//  node src/service.js uninstall

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { Service } = require('node-windows');

const projectDir = path.resolve(__dirname, '..');
const envPath = path.join(projectDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const svc = new Service({
  name: 'Weighing Main Agent',
  description: 'Combined Scale (Serial) + Print (PDF) agent with single MQTT client',
  script: path.join(__dirname, 'index.js'),
  workingDirectory: projectDir,
  wait: 2,
  grow: 0.25,
  maxRetries: 40,
  env: Object.keys(process.env).map((k) => ({ name: k, value: process.env[k] })),
});

svc.on('install', () => {
  console.log('Service installed. Starting...');
  svc.start();
});

svc.on('alreadyinstalled', () => console.log('Service already installed.'));
svc.on('start', () => console.log('Service started.'));
svc.on('stop', () => console.log('Service stopped.'));
svc.on('uninstall', () => console.log('Service uninstalled.'));
svc.on('error', (err) => console.error('Service error:', err));

const cmd = process.argv[2] || '';
if (cmd === 'install') svc.install();
else if (cmd === 'uninstall') svc.uninstall();
else {
  console.log('Usage: node src/service.js [install|uninstall]');
}

