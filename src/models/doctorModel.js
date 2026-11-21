const db = require('../config/db');

async function create({ name, specialty, consultation_fee, room }) {
  const sql = `
    INSERT INTO doctors (name, specialty, consultation_fee, room)
    VALUES (?, ?, ?, ?)
  `;
  const [result] = await db.query(sql, [name, specialty, consultation_fee, room]);
  return findById(result.insertId);
}

async function findAll() {
  const sql = `
    SELECT id, name, specialty, consultation_fee, room, created_at
    FROM doctors
    ORDER BY id ASC
  `;
  const [rows] = await db.query(sql);
  return rows;
}

async function findById(id) {
  const sql = `
    SELECT id, name, specialty, consultation_fee, room, created_at
    FROM doctors
    WHERE id = ?
  `;
  const [rows] = await db.query(sql, [id]);
  return rows[0] || null;
}

async function update(id, fields) {
  const allowed = ['name', 'specialty', 'consultation_fee', 'room'];
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
    UPDATE doctors
    SET ${sets.join(', ')}
    WHERE id = ?
  `;
  await db.query(sql, params);
  return findById(id);
}

async function remove(id) {
  const sql = `DELETE FROM doctors WHERE id = ?`;
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
