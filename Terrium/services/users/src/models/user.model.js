const { query } = require('../db/connection');

const findByEmail = async (email) => {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
};

const findById = async (id) => {
  const { rows } = await query('SELECT id, name, email, tier, is_active, created_at FROM users WHERE id = $1', [id]);
  return rows[0] || null;
};

const create = async ({ name, email, passwordHash, googleId = null }) => {
  const { rows } = await query(
    'INSERT INTO users (name, email, password_hash, google_id) VALUES ($1, $2, $3, $4) RETURNING id, name, email, tier, created_at',
    [name, email, passwordHash, googleId]
  );
  return rows[0];
};

const updateTier = async (id, tier) => {
  const { rows } = await query(
    'UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, tier',
    [tier, id]
  );
  return rows[0];
};

// Vincula una cuenta existente con su ID de Google (para usuarios que ya tenían cuenta con email/password)
const linkGoogleId = async (id, googleId) => {
  await query('UPDATE users SET google_id = $1, updated_at = NOW() WHERE id = $2', [googleId, id]);
};

module.exports = { findByEmail, findById, create, updateTier, linkGoogleId };

