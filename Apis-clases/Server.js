const express= require('express');
const app = express();
const productosController=require("./productosController");
app.use(express.json());
app.use("/productos", productosController);

app.get('/', (req, res) => {
    res.send('Hello World!=D')
});

//Parametros por QUERY PARAM
app.get("/buscar", (req, res) => {
    const nombre= req.query.nombre;
    if(nombre===undefined){
        return res.json({mensaje: "No ingresaste un valor de busqueda"});
    }

    res.json({mensaje: `Nombre Obtenido por QP: ${nombre}`});
    });

app.post("/productos", (req, res) => {
    const nuevoProducto= req.body;
    console.log("Valor del nuevo producto: "+ nuevoProducto.nombre);
    res.json({mensaje: "Producto creado", nuevoProducto});
})

//Indicamos el puerto de nuestra api
app.listen(3000, ()=>
{
    console.log("Server running on http://localhost:3000");
});