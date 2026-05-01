const express = require('express');
const router = express.Router();
const pool = require('./db');

// GET /api/productos - Obtener todos los productos
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// GET /api/productos/:id - Obtener un producto por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM productos WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el producto' });
    }
});

// POST /api/productos - Crear un nuevo producto
router.post('/', async (req, res) => {
    try {
        const { name, price } = req.body;
        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Los campos name y price son requeridos' });
        }
        const result = await pool.query(
            'INSERT INTO productos (name, price) VALUES ($1, $2) RETURNING *',
            [name, price]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear el producto' });
    }
});

// PUT /api/productos/:id - Actualizar un producto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price } = req.body;
        const result = await pool.query(
            'UPDATE productos SET name = $1, price = $2 WHERE id = $3 RETURNING *',
            [name, price, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el producto' });
    }
});

// DELETE /api/productos/:id - Eliminar un producto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM productos WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ message: 'Producto eliminado correctamente', producto: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
});

module.exports = router;
