<<<<<<< HEAD
const path = require('path');

// * Cargar variables de entorno desde backend/.env (compatibilidad nodemon vs node directo)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
=======
const path = require("path");

// * Cargar variables de entorno desde backend/.env (compatibilidad nodemon vs node directo)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
>>>>>>> 1224b36 (Actualización de todos los archivos)

// * Parseo robusto de DATABASE_URL → objeto de config legible por pg
function parseDatabaseUrl(dbUrl) {
  const u = new URL(dbUrl);
  return {
    host: u.hostname,
    port: Number(u.port || 5432),
<<<<<<< HEAD
    user: decodeURIComponent(u.username || 'postgres'),
    password: decodeURIComponent(u.password || ''),
    database: decodeURIComponent((u.pathname || '/postgres').slice(1)),
=======
    user: decodeURIComponent(u.username || "postgres"),
    password: decodeURIComponent(u.password || ""),
    database: decodeURIComponent((u.pathname || "/postgres").slice(1)),
>>>>>>> 1224b36 (Actualización de todos los archivos)
  };
}

function buildDatabaseConfig() {
<<<<<<< HEAD
  const rawDatabaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
=======
  const rawDatabaseUrl =
    process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
>>>>>>> 1224b36 (Actualización de todos los archivos)
  const hasConnectionString = Boolean(rawDatabaseUrl);

  let baseConfig;
  if (hasConnectionString) {
    try {
      baseConfig = parseDatabaseUrl(rawDatabaseUrl);
    } catch (e) {
<<<<<<< HEAD
      console.warn('No se pudo parsear DATABASE_URL, usando connectionString directo. Motivo:', e.message);
=======
      console.warn(
        "No se pudo parsear DATABASE_URL, usando connectionString directo. Motivo:",
        e.message
      );
>>>>>>> 1224b36 (Actualización de todos los archivos)
      baseConfig = { connectionString: rawDatabaseUrl };
    }
  } else {
    baseConfig = {
<<<<<<< HEAD
      host: (process.env.DB_HOST && process.env.DB_HOST.trim()) || 'localhost',
      user: (process.env.DB_USER && process.env.DB_USER.trim()) || 'postgres',
      password: process.env.DB_PASSWORD,
      database: (process.env.DB_NAME && process.env.DB_NAME.trim()) || 'historias_clinicas',
=======
      host: (process.env.DB_HOST && process.env.DB_HOST.trim()) || "localhost",
      user: (process.env.DB_USER && process.env.DB_USER.trim()) || "postgres",
      password: process.env.DB_PASSWORD,
      database:
        (process.env.DB_NAME && process.env.DB_NAME.trim()) ||
        "historias_clinicas",
>>>>>>> 1224b36 (Actualización de todos los archivos)
      port: Number((process.env.DB_PORT && process.env.DB_PORT.trim()) || 5432),
    };
  }

<<<<<<< HEAD
  const sslMode = String(process.env.PGSSLMODE || '').trim().toLowerCase();
  const noSSL = String(process.env.NO_SSL || '').trim().toLowerCase() === 'true' || sslMode === 'disable';
  const noVerify = sslMode === 'no-verify' || sslMode === 'prefer';
  const sslConfig = noSSL ? false : { require: true, rejectUnauthorized: !noVerify };
=======
  const sslMode = String(process.env.PGSSLMODE || "")
    .trim()
    .toLowerCase();
  const noSSL =
    String(process.env.NO_SSL || "")
      .trim()
      .toLowerCase() === "true" || sslMode === "disable";
  const noVerify = sslMode === "no-verify" || sslMode === "prefer";
  const sslConfig = noSSL
    ? false
    : { require: true, rejectUnauthorized: !noVerify };
>>>>>>> 1224b36 (Actualización de todos los archivos)

  const poolConfig = {
    ...baseConfig,
    ssl: sslConfig,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    max: Number(process.env.PGPOOL_MAX || 10),
  };

  const safeConfig = {
    host: baseConfig.host,
    port: baseConfig.port,
    database: baseConfig.database,
<<<<<<< HEAD
    user: baseConfig.user ? baseConfig.user.replace(/.*/, '***') : undefined,
    ssl: sslConfig ? { require: sslConfig.require, rejectUnauthorized: sslConfig.rejectUnauthorized } : false,
=======
    user: baseConfig.user ? baseConfig.user.replace(/.*/, "***") : undefined,
    ssl: sslConfig
      ? {
          require: sslConfig.require,
          rejectUnauthorized: sslConfig.rejectUnauthorized,
        }
      : false,
>>>>>>> 1224b36 (Actualización de todos los archivos)
  };

  return {
    rawDatabaseUrl,
    hasConnectionString,
    baseConfig,
    sslConfig,
    poolConfig,
    safeConfig,
  };
}

module.exports = {
  buildDatabaseConfig,
  parseDatabaseUrl,
};
