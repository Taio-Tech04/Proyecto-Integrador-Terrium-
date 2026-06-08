const router = require('express').Router();
const mongoose = require('mongoose');
const Favorite = require('../models/favorite.model');
const authMiddleware = require('../middleware/auth');

// Todos los endpoints de favoritos requieren autenticación
router.use(authMiddleware);

// GET /api/favorites — Lista de favoritos del usuario autenticado
router.get('/', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Servicio de favoritos no disponible' });
  }
  try {
    const userId = req.user.userId;
    const favorites = await Favorite.find({ userId }).sort({ savedAt: -1 });
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

// POST /api/favorites — Guardar una propiedad en favoritos
router.post('/', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Servicio de favoritos no disponible' });
  }
  try {
    const userId = req.user.userId;
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ error: 'listingId es requerido' });

    const favorite = await Favorite.create({ userId, listingId });
    res.status(201).json(favorite);
  } catch (err) {
    // Código 11000 = índice único duplicado (ya está en favoritos)
    if (err.code === 11000) {
      return res.status(400).json({ error: 'La propiedad ya está en tus favoritos' });
    }
    res.status(500).json({ error: 'Error al guardar favorito' });
  }
});

// DELETE /api/favorites/:listingId — Eliminar un favorito
router.delete('/:listingId', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Servicio de favoritos no disponible' });
  }
  try {
    const userId = req.user.userId;
    const listingId = parseInt(req.params.listingId);
    const result = await Favorite.findOneAndDelete({ userId, listingId });
    if (!result) return res.status(404).json({ error: 'Favorito no encontrado' });
    res.json({ message: 'Favorito eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
});

module.exports = router;
