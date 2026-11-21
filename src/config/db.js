require('dotenv').config();

const mysql = require('mysql2/promise');

/**
 * Shared MySQL connection pool.
 * Models should use this module for all database access (parameterized queries only).
 */
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'medibook',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
});

/**
 * Run a parameterized query against the pool.
 * @param {string} sql
 * @param {Array} [params]
 * @returns {Promise<[rows, fields]>}
 */
async function query(sql, params = []) {
  return pool.query(sql, params);
}

/**
 * Get a dedicated connection (for transactions).
 * Caller must release() the connection.
 * @returns {Promise<import('mysql2/promise').PoolConnection>}
 */
async function getConnection() {
  return pool.getConnection();
}

module.exports = {
  pool,
  query,
  getConnection,
};
