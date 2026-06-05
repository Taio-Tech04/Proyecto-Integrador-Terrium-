const { query } = require('../db/connection');
const router = require('express').Router();

router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { rows } = await query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [userId]);
    res.json(rows);
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
