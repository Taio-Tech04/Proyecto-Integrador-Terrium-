const { query } = require('../db/connection');
const router = require('express').Router();

// El servicio usa el esquema canónico `notificacion`. Estas rutas leen/escriben esa
// tabla pero exponen el shape legacy (id = notification_id) que consumían los clientes.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT_NOTIF = `
  SELECT notification_id AS id, user_id, type, subject, body, status, sent_at, created_at
    FROM notificacion`;

router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    if (!UUID_RE.test(userId || '')) {
      return res.status(400).json({ error: 'x-user-id inválido (UUID)' });
    }
    const page   = parseInt(req.query.page)  || 1;
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { rows } = await query(
      `${SELECT_NOTIF} WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const { rows: countRows } = await query(
      'SELECT COUNT(*) FROM notificacion WHERE user_id = $1',
      [userId]
    );

    res.json({ data: rows, total: parseInt(countRows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) {
      return res.status(400).json({ error: 'id de notificación inválido (UUID)' });
    }
    await query(`UPDATE notificacion SET status = 'LEIDO' WHERE notification_id = $1`, [req.params.id]);
    res.json({ message: 'Notificación marcada como leída' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar notificación' });
  }
});

module.exports = router;
