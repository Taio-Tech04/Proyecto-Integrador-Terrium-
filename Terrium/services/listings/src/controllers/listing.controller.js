const Joi = require('joi');
const { query } = require('../db/connection');
const { publish } = require('../events/publisher');
const logger = require('../utils/logger');

const createSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().optional(),
  priceUsd: Joi.number().positive().required(),
  surfaceM2: Joi.number().positive().required(),
  rooms: Joi.number().integer().min(0).default(0),
  type: Joi.string().valid('DEPARTAMENTO','CASA','PH','OFICINA','LOCAL','TERRENO').required(),
  neighborhood: Joi.string().required(),
  lat: Joi.number().optional(),
  lng: Joi.number().optional()
});

const getAll = async (req, res) => {
  try {
    const { type, neighborhood, minPrice, maxPrice, minSurface, rooms } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    let conditions = ["status = 'ACTIVO'"];
    const values = [];
    let idx = 1;

    if (type) { conditions.push(`type = $${idx++}`); values.push(type); }
    if (neighborhood) { conditions.push(`neighborhood ILIKE $${idx++}`); values.push(`%${neighborhood}%`); }
    if (minPrice) { conditions.push(`price_usd >= $${idx++}`); values.push(parseFloat(minPrice)); }
    if (maxPrice) { conditions.push(`price_usd <= $${idx++}`); values.push(parseFloat(maxPrice)); }
    if (minSurface) { conditions.push(`surface_m2 >= $${idx++}`); values.push(parseFloat(minSurface)); }
    if (rooms) { conditions.push(`rooms = $${idx++}`); values.push(parseInt(rooms)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT * FROM listings ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM listings ${where}`, values);

    res.json({ data: rows, total: parseInt(countRows[0].count), page, limit });
  } catch (err) {
    logger.error('Error en getAll:', err);
    res.status(500).json({ error: 'Error al obtener propiedades' });
  }
};

const getById = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Propiedad no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener propiedad' });
  }
};

const create = async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const ownerId = req.headers['x-user-id'] || null;
    const { rows } = await query(
      `INSERT INTO listings (title, description, price_usd, surface_m2, rooms, type, neighborhood, lat, lng, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [value.title, value.description, value.priceUsd, value.surfaceM2, value.rooms, value.type, value.neighborhood, value.lat, value.lng, ownerId]
    );
    await publish('listings', 'listing.created', rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error('Error en create:', err);
    res.status(500).json({ error: 'Error al crear propiedad' });
  }
};

const update = async (req, res) => {
  try {
    const { rows: existing } = await query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'Propiedad no encontrada' });

    const fields = Object.keys(req.body);
    const columnMap = { priceUsd: 'price_usd', surfaceM2: 'surface_m2', priceArs: 'price_ars' };
    const sets = fields.map((f, i) => `${columnMap[f] || f} = $${i + 2}`).join(', ');
    const values = fields.map((f) => req.body[f]);

    const { rows } = await query(
      `UPDATE listings SET ${sets}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    await publish('listings', 'listing.updated', rows[0]);
    res.json(rows[0]);
  } catch (err) {
    logger.error('Error en update:', err);
    res.status(500).json({ error: 'Error al actualizar propiedad' });
  }
};

const remove = async (req, res) => {
  try {
    const { rows } = await query('DELETE FROM listings WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Propiedad no encontrada' });
    await publish('listings', 'listing.deleted', { id: req.params.id });
    res.json({ message: 'Propiedad eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar propiedad' });
  }
};

module.exports = { getAll, getById, create, update, remove };

