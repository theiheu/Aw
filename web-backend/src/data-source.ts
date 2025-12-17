import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';

// Load .env if present
loadEnv();

const isProd = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'weighuser',
  password: process.env.DB_PASSWORD || 'weighpass',
  database: process.env.DB_NAME || 'weighing',
  // Use ts in dev and js in prod
  entities: [
    isProd ? join(__dirname, './modules/**/entities/*.js') : join(__dirname, './modules/**/entities/*.ts'),
  ],
  migrations: [
    isProd ? join(__dirname, './database/migrations/*.js') : join(__dirname, './database/migrations/*.ts'),
  ],
  synchronize: false,
  logging: process.env.TYPEORM_LOGGING === 'true' || process.env.NODE_ENV !== 'production',
});

export default AppDataSource;


