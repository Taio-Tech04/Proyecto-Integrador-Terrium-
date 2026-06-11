const { query } = require('../db/connection');
const router = require('express').Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const page   = parseInt(req.query.page)  || 1;
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const { rows } = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    const { rows: countRows } = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
      [userId]
    );

    res.json({ data: rows, total: parseInt(countRows[0].count), page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    await query(`UPDATE notifications SET status = 'LEIDO' WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Notificación marcada como leída' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar notificación' });
  }
});

module.exports = router;
