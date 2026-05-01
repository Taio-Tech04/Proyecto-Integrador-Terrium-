require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const productosRouter = require('./productosController');
const usuariosRouter = require('./usuariosController');

const app = express();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/productos', productosRouter);
app.use('/api/usuarios', usuariosRouter);

// Ruta raíz
app.get('/', (req, res) => {
    res.json({
        message: 'API REST con Node.js, Express, PostgreSQL y MySQL',
        endpoints: {
            productos: '/api/productos',
            usuarios: '/api/usuarios'
        }
    });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Inicio del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
