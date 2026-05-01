const express = require('express');
const router = express.Router();

router.get('/',(req,res)=>{
    res.json([
        {id:1 ,nombre: "Laptop", precio: 1500},
        {id:2, nombre: "Celular", precio: 500},
        {id:3 ,nombre: "Impresora", precio: 250},
    ])
})
router.post('/',(req,res)=>{
    const nuevoProducto = req.body;
    console.log("Valor del nuevo Producto"+ nuevoProducto.nombre)
    res.json({mensaje: "Producto creado", nuevoProducto})

});

module.exports = router;