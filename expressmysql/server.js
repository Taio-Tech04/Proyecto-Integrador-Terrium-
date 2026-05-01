const express = require('express');
const app = express();
const usuariosRouter = require('./usuariosController');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/usuarios', usuariosRouter);

app.get('/', (req, res) => {
    res.json({ message: 'API REST con Node.js, Express y MySQL' });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

module.exports = app;