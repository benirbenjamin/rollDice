import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDB } from 'sqlite';
import path from 'path';
import fs from 'fs';

// Connection instances
let pgPool: Pool | null = null;
let sqliteDb: SQLiteDB | null = null;
let isInitialized = false;

// Check if running PostgreSQL via DATABASE_URL
const usePostgres = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));

export async function getDb() {
  if (usePostgres) {
    if (!pgPool) {
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
      });
    }
  } else {
    if (!sqliteDb) {
      const dbDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      sqliteDb = await open({
        filename: path.join(dbDir, 'rolldice.sqlite'),
        driver: sqlite3.Database,
      });
    }
  }

  if (!isInitialized) {
    await initDatabase();
    isInitialized = true;
  }

  return { usePostgres, pgPool, sqliteDb };
}

// Auto-create all required database tables automatically on first run
async function initDatabase() {
  try {
    if (usePostgres && pgPool) {
      const client = await pgPool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            role VARCHAR(20) DEFAULT 'USER',
            wallet_balance NUMERIC(12, 2) DEFAULT 0.00,
            is_verified BOOLEAN DEFAULT FALSE,
            status VARCHAR(20) DEFAULT 'ACTIVE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS otp_codes (
            id VARCHAR(64) PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            code VARCHAR(10) NOT NULL,
            type VARCHAR(20) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS transactions (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL,
            type VARCHAR(20) NOT NULL,
            amount NUMERIC(12, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'PENDING',
            flutterwave_ref VARCHAR(255),
            payment_method VARCHAR(50),
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS game_rooms (
            id VARCHAR(64) PRIMARY KEY,
            player1_id VARCHAR(64) NOT NULL,
            player2_id VARCHAR(64),
            mode VARCHAR(20) NOT NULL,
            stake NUMERIC(12, 2) DEFAULT 0.00,
            target_score INT DEFAULT 300,
            p1_score INT DEFAULT 0,
            p2_score INT DEFAULT 0,
            current_turn INT DEFAULT 0,
            current_accumulated INT DEFAULT 0,
            status VARCHAR(20) DEFAULT 'WAITING',
            winner_id VARCHAR(64),
            rake_amount NUMERIC(12, 2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS page_views (
            id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64),
            path VARCHAR(255) NOT NULL,
            ip_address VARCHAR(100),
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(100) PRIMARY KEY,
            value TEXT NOT NULL
          );
        `);

        // Seed default admin and settings if not present
        await client.query(`
          INSERT INTO users (id, name, email, role, wallet_balance, is_verified, status)
          VALUES ('admin-01', 'Master Admin', 'admin@rolldice.com', 'ADMIN', 100000.00, TRUE, 'ACTIVE')
          ON CONFLICT (email) DO NOTHING;

          INSERT INTO system_settings (key, value) VALUES
          ('house_rake_percent', '10'),
          ('house_balance', '0.00'),
          ('min_stake', '20'),
          ('max_stake', '100000'),
          ('min_withdraw', '10'),
          ('target_score', '300')
          ON CONFLICT (key) DO UPDATE SET value = '20' WHERE system_settings.key = 'min_stake' AND system_settings.value = '500';
        `);
      } finally {
        client.release();
      }
    } else if (sqliteDb) {
      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          role TEXT DEFAULT 'USER',
          wallet_balance REAL DEFAULT 0.00,
          is_verified INTEGER DEFAULT 0,
          status TEXT DEFAULT 'ACTIVE',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS otp_codes (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          type TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          status TEXT DEFAULT 'PENDING',
          flutterwave_ref TEXT,
          payment_method TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS game_rooms (
          id TEXT PRIMARY KEY,
          player1_id TEXT NOT NULL,
          player2_id TEXT,
          mode TEXT NOT NULL,
          stake REAL DEFAULT 0.00,
          target_score INTEGER DEFAULT 300,
          p1_score INTEGER DEFAULT 0,
          p2_score INTEGER DEFAULT 0,
          current_turn INTEGER DEFAULT 0,
          current_accumulated INTEGER DEFAULT 0,
          status TEXT DEFAULT 'WAITING',
          winner_id TEXT,
          rake_amount REAL DEFAULT 0.00,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS page_views (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          path TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        INSERT OR IGNORE INTO users (id, name, email, role, wallet_balance, is_verified, status)
        VALUES ('admin-01', 'Master Admin', 'admin@rolldice.com', 'ADMIN', 100000.00, 1, 'ACTIVE');

        INSERT OR IGNORE INTO system_settings (key, value) VALUES ('house_rake_percent', '10');
        INSERT OR IGNORE INTO system_settings (key, value) VALUES ('house_balance', '0.00');
        INSERT OR REPLACE INTO system_settings (key, value) VALUES ('min_stake', '20');
        INSERT OR IGNORE INTO system_settings (key, value) VALUES ('max_stake', '100000');
        INSERT OR IGNORE INTO system_settings (key, value) VALUES ('min_withdraw', '10');
        INSERT OR IGNORE INTO system_settings (key, value) VALUES ('target_score', '300');
      `);
    }
  } catch (error) {
    console.error('Failed to auto-create database tables:', error);
  }
}

// Universal database helper queries
export async function dbQuery(querySql: string, params: any[] = []): Promise<any[]> {
  const { usePostgres, pgPool, sqliteDb } = await getDb();
  if (usePostgres && pgPool) {
    // Convert ? placeholders to $1, $2 for Postgres
    let paramIndex = 1;
    const pgSql = querySql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  } else if (sqliteDb) {
    return await sqliteDb.all(querySql, params);
  }
  return [];
}

export async function dbExecute(querySql: string, params: any[] = []): Promise<any> {
  const { usePostgres, pgPool, sqliteDb } = await getDb();
  if (usePostgres && pgPool) {
    let paramIndex = 1;
    const pgSql = querySql.replace(/\?/g, () => `$${paramIndex++}`);
    const res = await pgPool.query(pgSql, params);
    return { rowCount: res.rowCount };
  } else if (sqliteDb) {
    const res = await sqliteDb.run(querySql, params);
    return { lastID: res.lastID, changes: res.changes };
  }
}
