const { query } = require('../db/connection');

// El esquema canónico (español) modela los planes en `suscripcion`/`plan_suscripcion`
// con plan_type free/investor/seller. El resto de la app razona en "tiers"
// (FREE/PRO/ENTERPRISE), así que derivamos el tier a partir del plan activo
// y del user_type. Mantener este mapeo en un solo lugar.
const PLAN_TYPE_TO_TIER = { free: 'FREE', investor: 'PRO', seller: 'PRO' };

const deriveTier = (userType, planType) => {
  if (userType === 'admin') return 'ENTERPRISE';
  return PLAN_TYPE_TO_TIER[planType] || 'FREE';
};

// SELECT base sobre `usuario`, normalizando los nombres a los que espera la app
// (id, name) y trayendo el plan_type del plan activo (si tiene).
const SELECT_USER = `
  SELECT u.user_id AS id,
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))), '') AS name,
         u.email, u.password_hash, u.user_type, u.is_active, u.google_id, u.created_at,
         (SELECT ps.plan_type
            FROM suscripcion s
            JOIN plan_suscripcion ps ON ps.plan_id = s.plan_id
           WHERE s.user_id = u.user_id AND LOWER(s.status) = 'active'
           ORDER BY s.start_date DESC NULLS LAST LIMIT 1) AS plan_type
  FROM usuario u`;

const decorate = (row) => {
  if (!row) return null;
  row.tier = deriveTier(row.user_type, row.plan_type);
  if (!row.name) row.name = row.email;
  return row;
};

const findByEmail = async (email) => {
  const { rows } = await query(`${SELECT_USER} WHERE u.email = $1`, [email]);
  return decorate(rows[0]);
};

const findById = async (id) => {
  const { rows } = await query(`${SELECT_USER} WHERE u.user_id = $1`, [id]);
  const u = decorate(rows[0]);
  if (u) delete u.password_hash; // no exponer el hash en lecturas de perfil
  return u;
};

const create = async ({ name, email, passwordHash, googleId = null }) => {
  // usuario.password_hash es NOT NULL; para cuentas solo-OAuth usamos un sentinel
  // que bcrypt.compare nunca matchea (solo pueden entrar por Google).
  const hash = passwordHash || 'oauth-no-password';
  const parts = (name || '').trim().split(/\s+/);
  const firstName = parts.shift() || null;
  const lastName = parts.join(' ') || null;

  const { rows } = await query(
    `INSERT INTO usuario (email, password_hash, first_name, last_name, user_type, google_id, is_active, is_verified)
     VALUES ($1, $2, $3, $4, 'investor', $5, true, false)
     RETURNING user_id`,
    [email, hash, firstName, lastName, googleId]
  );
  return findById(rows[0].user_id);
};

const linkGoogleId = async (id, googleId) => {
  await query('UPDATE usuario SET google_id = $1, updated_at = NOW() WHERE user_id = $2', [googleId, id]);
};

module.exports = { findByEmail, findById, create, linkGoogleId, deriveTier, PLAN_TYPE_TO_TIER };
