const express = require('express');
const router = express.Router();
const pool = require('./dbMysql');

// GET /api/usuarios - Obtener todos los usuarios
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM usuarios');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// GET /api/usuarios/:id - Obtener un usuario por ID
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

// POST /api/usuarios - Crear un nuevo usuario
router.post('/', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Los campos nombre, email y password son requeridos' });
        }
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
            [nombre, email, hashedPassword]
        );
        res.status(201).json({ id: result.insertId, nombre, email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});

// PUT /api/usuarios/:id - Actualizar un usuario
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Los campos nombre, email y password son requeridos' });
        }
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'UPDATE usuarios SET nombre = ?, email = ?, password = ? WHERE id = ?',
            [nombre, email, hashedPassword, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json({ id, nombre, email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

// DELETE /api/usuarios/:id - Eliminar un usuario
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

