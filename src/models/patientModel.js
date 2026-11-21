const db = require('../config/db');

async function create({ name, email, phone }) {
  const sql = `
    INSERT INTO patients (name, email, phone)
    VALUES (?, ?, ?)
  `;
  const [result] = await db.query(sql, [name, email, phone]);
  return findById(result.insertId);
}

async function findAll() {
  const sql = `
    SELECT id, name, email, phone, created_at
    FROM patients
    ORDER BY id ASC
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function findById(id) {
  const sql = `
    SELECT id, name, email, phone, created_at
    FROM patients
    WHERE id = ?
  `;
  const [rows] = await db.query(sql, [id]);
  return rows[0] || null;
}

async function update(id, fields) {
  const allowed = ['name', 'email', 'phone'];
  const sets = [];
  const params = [];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      sets.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }

  if (sets.length === 0) {
    return findById(id);
  }

  params.push(id);
  const sql = `
    UPDATE patients
    SET ${sets.join(', ')}
    WHERE id = ?
  `;
  await db.query(sql, params);
  return findById(id);
}

async function remove(id) {
  const sql = `DELETE FROM patients WHERE id = ?`;
  const [result] = await db.query(sql, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  create,
  findAll,
  findById,
  update,
  remove,
};
