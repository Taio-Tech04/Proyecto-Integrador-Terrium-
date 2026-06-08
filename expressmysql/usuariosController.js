const express = require('express');
const router = express.Router();
const pool = require('./database');

router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios ORDER BY id ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { nombre, email } = req.body;
        if (!nombre || !email) {
            return res.status(400).json({ error: 'Los campos nombre y email son requeridos' });
        }
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, email) VALUES (?, ?)',
            [nombre, email]
        );
        res.status(201).json({ id: result.insertId, nombre, email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email } = req.body;
        if (!nombre || !email) {
            return res.status(400).json({ error: 'Los campos nombre y email son requeridos' });
        }
        const [result] = await pool.query(
            'UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?',
            [nombre, email, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ id: parseInt(id), nombre, email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ message: 'Usuario eliminado correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
});

module.exports = router;