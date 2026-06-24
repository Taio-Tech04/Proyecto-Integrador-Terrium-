const Joi = require('joi');
const { query } = require('../db/connection');
const { publish } = require('../events/publisher');
const logger = require('../utils/logger');

// El servicio usa el esquema canónico `propiedad` (+ `zona`). Este controller actúa
// como adaptador: lee/escribe propiedad pero expone el shape "listings" que ya
// consumen el frontend y los resolvers GraphQL (id, price_usd, surface_m2, type,
// neighborhood, ...), para no propagar el cambio de esquema fuera del servicio.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createSchema = Joi.object({
  title:        Joi.string().min(3).max(200).optional(),
  description:  Joi.string().optional(),
  priceUsd:     Joi.number().positive().optional(),
  price_usd:    Joi.number().positive().optional(),
  priceArs:     Joi.number().positive().optional(),
  price_ars:    Joi.number().positive().optional(),
  surfaceM2:    Joi.number().positive().optional(),
  surface_m2:   Joi.number().positive().optional(),
  rooms:        Joi.number().integer().min(0).default(0),
  bathrooms:    Joi.number().integer().min(0).optional(),
  type:         Joi.string().max(50).optional(),
  propertyType: Joi.string().max(50).optional(),
  neighborhood: Joi.string().required(),
  address:      Joi.string().max(200).optional(),
  lat:          Joi.number().optional(),
  lng:          Joi.number().optional()
});

// Fila de propiedad (con zona joineada) → shape legacy "listing"
const toLegacy = (r) => ({
  id:          r.property_id,
  title:       r.title,
  description: r.description,
  price_usd:   r.currency === 'ARS' ? null : r.price,
  price_ars:   r.currency === 'ARS' ? r.price : null,
  surface_m2:  r.total_area,
  rooms:       r.bedrooms,
  bathrooms:   r.bathrooms,
  type:        (r.operation_type || '').toUpperCase(),
  property_type: r.property_type,
  neighborhood: r.zone_name,
  address:     r.address,
  lat:         r.latitude,
  lng:         r.longitude,
  status:      r.status === 'available' ? 'ACTIVO' : (r.status || '').toUpperCase(),
  owner_id:    r.owner_id,
  images:      r.cover_image_url ? [r.cover_image_url] : [],
  amenities:   [],
  created_at:  r.created_at,
  updated_at:  r.updated_at
});

const SELECT_PROP = `
  SELECT p.property_id, p.title, p.description, p.price, p.currency, p.total_area, p.covered_area,
         p.bedrooms, p.bathrooms, p.operation_type, p.property_type, z.name AS zone_name,
         p.address, p.latitude, p.longitude, p.status, p.is_active, p.owner_id,
         p.cover_image_url, p.created_at, p.updated_at
    FROM propiedad p
    LEFT JOIN zona z ON z.zone_id = p.zone_id`;

// Resuelve (o crea) la zona por nombre y devuelve su zone_id
const resolveZoneId = async (name) => {
  if (!name) return null;
  const { rows } = await query('SELECT zone_id FROM zona WHERE name ILIKE $1 LIMIT 1', [name.trim()]);
  if (rows[0]) return rows[0].zone_id;
  const ins = await query('INSERT INTO zona (name) VALUES ($1) RETURNING zone_id', [name.trim()]);
  return ins.rows[0].zone_id;
};

const getAll = async (req, res) => {
  try {
    const { type, neighborhood, minPrice, maxPrice, minSurface, rooms } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const conditions = ['p.is_active = true'];
    const values = [];
    let idx = 1;

    if (type) { conditions.push(`p.operation_type ILIKE $${idx++}`); values.push(type); }
    if (neighborhood) { conditions.push(`z.name ILIKE $${idx++}`); values.push(`%${neighborhood}%`); }
    if (minPrice) { conditions.push(`p.price >= $${idx++}`); values.push(parseFloat(minPrice)); }
    if (maxPrice) { conditions.push(`p.price <= $${idx++}`); values.push(parseFloat(maxPrice)); }
    if (minSurface) { conditions.push(`p.total_area >= $${idx++}`); values.push(parseFloat(minSurface)); }
    if (rooms) { conditions.push(`p.bedrooms = $${idx++}`); values.push(parseInt(rooms)); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const { rows } = await query(
      `${SELECT_PROP} ${where} ORDER BY p.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );
    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM propiedad p LEFT JOIN zona z ON z.zone_id = p.zone_id ${where}`, values
    );

    res.json({ data: rows.map(toLegacy), total: parseInt(countRows[0].count), page, limit });
  } catch (err) {
    logger.error('Error en getAll:', err);
    res.status(500).json({ error: 'Error al obtener propiedades' });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id;
    if (!UUID_RE.test(id)) return res.status(400).json({ error: 'ID inválido' });
    const { rows } = await query(`${SELECT_PROP} WHERE p.property_id = $1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Propiedad no encontrada' });
    res.json(toLegacy(rows[0]));
  } catch (err) {
    logger.error('Error en getById:', err);
    res.status(500).json({ error: 'Error al obtener propiedad' });
  }
};

const create = async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body, { allowUnknown: false });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const priceUsd  = value.priceUsd  || value.price_usd  || null;
    const priceArs  = value.priceArs  || value.price_ars  || null;
    const surfaceM2 = value.surfaceM2 || value.surface_m2;
    const operation = (value.type || 'VENTA');
    const address   = value.address || null;

    if (!priceUsd && !priceArs) return res.status(400).json({ error: 'Debés ingresar al menos un precio (USD o ARS)' });
    if (!surfaceM2) return res.status(400).json({ error: 'La superficie es requerida' });

    const price    = priceUsd || priceArs;
    const currency = priceUsd ? 'USD' : 'ARS';
    const title    = value.title || `${operation} en ${value.neighborhood}${address ? ' · ' + address : ''}`;
    const ownerId  = req.headers['x-user-id'] || null;
    const zoneId   = await resolveZoneId(value.neighborhood);

    const { rows } = await query(
      `INSERT INTO propiedad
         (owner_id, zone_id, title, description, property_type, operation_type, address,
          latitude, longitude, price, currency, total_area, covered_area, bedrooms, bathrooms, status, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,$14,'available',true)
       RETURNING property_id`,
      [ownerId, zoneId, title, value.description || null, value.propertyType || 'Departamento', operation,
       address, value.lat, value.lng, price, currency, surfaceM2, value.rooms || 0, value.bathrooms || 0]
    );

    const { rows: full } = await query(`${SELECT_PROP} WHERE p.property_id = $1`, [rows[0].property_id]);
    const listing = toLegacy(full[0]);
    await publish('listings', 'listing.created', listing);
    res.status(201).json(listing);
  } catch (err) {
    logger.error('Error en create:', err);
    res.status(500).json({ error: 'Error al crear propiedad' });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    if (!UUID_RE.test(id)) return res.status(400).json({ error: 'ID inválido' });

    const { rows: existing } = await query('SELECT property_id FROM propiedad WHERE property_id = $1', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Propiedad no encontrada' });

    // Campo legacy permitido → columna de propiedad
    const COLUMN_MAP = {
      title: 'title', description: 'description', priceUsd: 'price', priceArs: 'price',
      surfaceM2: 'total_area', rooms: 'bedrooms', status: 'status'
    };
    const STATUS_MAP = { ACTIVO: 'available', PAUSADO: 'paused', VENDIDO: 'sold', ALQUILADO: 'rented' };

    const sets = [];
    const values = [];
    let idx = 2;
    for (const [field, col] of Object.entries(COLUMN_MAP)) {
      if (req.body[field] === undefined) continue;
      let v = req.body[field];
      if (field === 'status') v = STATUS_MAP[v] || String(v).toLowerCase();
      sets.push(`${col} = $${idx++}`); values.push(v);
    }
    if (!sets.length) return res.status(400).json({ error: 'No se proporcionaron campos válidos para actualizar' });

    await query(`UPDATE propiedad SET ${sets.join(', ')}, updated_at = NOW() WHERE property_id = $1`, [id, ...values]);
    const { rows } = await query(`${SELECT_PROP} WHERE p.property_id = $1`, [id]);
    const listing = toLegacy(rows[0]);
    await publish('listings', 'listing.updated', listing);
    res.json(listing);
  } catch (err) {
    logger.error('Error en update:', err);
    res.status(500).json({ error: 'Error al actualizar propiedad' });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    if (!UUID_RE.test(id)) return res.status(400).json({ error: 'ID inválido' });
    // Borrado lógico (la propiedad puede estar referenciada por publicacion/favorito/consulta)
    const { rows } = await query(
      `UPDATE propiedad SET is_active = false, status = 'inactive', updated_at = NOW()
       WHERE property_id = $1 AND is_active = true RETURNING property_id`, [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Propiedad no encontrada' });
    await publish('listings', 'listing.deleted', { id });
    res.json({ message: 'Propiedad eliminada' });
  } catch (err) {
    logger.error('Error en remove:', err);
    res.status(500).json({ error: 'Error al eliminar propiedad' });
  }
};

module.exports = { getAll, getById, create, update, remove };
