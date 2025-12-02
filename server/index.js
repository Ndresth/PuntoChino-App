require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx'); // <--- NUEVO: Importamos la librería de Excel

const Order = require('./models/OrderModel');
// Importamos el modelo de Productos
const Product = require('./models/ProductModel');

const app = express();
const PORT = process.env.PORT || 3000;

// TU URL DE MONGO
const MONGO_URI = process.env.MONGO_URI;

// --- 1. CONEXIÓN A BASE DE DATOS ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('🟢 Servidor conectado a MongoDB Atlas'))
    .catch(err => console.error('🔴 Error conectando a Mongo:', err));

// Middleware
app.use(cors());

// --- Límite aumentado para fotos pesadas ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 2. RUTAS PÚBLICAS (IMÁGENES) ---
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// --- 3. API ROUTES (CRUD PRODUCTOS) ---

// GET: Obtener todos
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Product.find().sort({ id: 1 });
        res.json(productos);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener productos", error });
    }
});

// POST: Crear producto
app.post('/api/productos', async (req, res) => {
    try {
        const nuevoProducto = new Product(req.body);
        await nuevoProducto.save();
        res.status(201).json(nuevoProducto);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT: Actualizar producto
app.put('/api/productos/:id', async (req, res) => {
    try {
        const actualizado = await Product.findOneAndUpdate(
            { id: req.params.id }, 
            req.body, 
            { new: true }
        );
        res.json(actualizado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE: Eliminar producto
app.delete('/api/productos/:id', async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- RUTAS DE PEDIDOS (POS / CLIENTE) ---

// 1. GUARDAR NUEVO PEDIDO
app.post('/api/orders', async (req, res) => {
    try {
        const nuevaOrden = new Order(req.body);
        await nuevaOrden.save();
        res.status(201).json(nuevaOrden);
    } catch (error) {
        res.status(400).json({ message: "Error al guardar pedido", error });
    }
});

// 2. VER PEDIDOS PENDIENTES (Para la Caja)
app.get('/api/orders', async (req, res) => {
    try {
        const ordenes = await Order.find({ estado: 'Pendiente' }).sort({ fecha: -1 });
        res.json(ordenes);
    } catch (error) {
        res.status(500).json({ message: "Error al leer pedidos", error });
    }
});

// 3. MARCAR COMO COMPLETADO
app.put('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { estado: 'Completado' });
        res.json({ message: 'Orden completada' });
    } catch (error) {
        res.status(500).json({ message: "Error", error });
    }
});

// --- ZONA FINANCIERA (NUEVO: REPORTES Y EXCEL) ---

// 1. VER TOTAL VENDIDO HOY (En Bruto)
app.get('/api/ventas/hoy', async (req, res) => {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const ordenesHoy = await Order.find({
            fecha: { $gte: startOfDay, $lte: endOfDay }
        });

        const totalVentas = ordenesHoy.reduce((acc, orden) => acc + orden.total, 0);
        
        res.json({ total: totalVentas, cantidadPedidos: ordenesHoy.length });
    } catch (error) {
        res.status(500).json({ message: "Error calculando ventas", error });
    }
});

// 2. DESCARGAR EXCEL
app.get('/api/ventas/excel', async (req, res) => {
    try {
        // Descargamos TODO lo que haya en la base de datos de ordenes
        // (Ya que al cerrar caja se borra todo, descargamos el historial completo presente)
        const ordenes = await Order.find().lean();

        // Transformar datos para que el Excel se vea bonito
        const datosExcel = ordenes.map(o => ({
            Fecha: new Date(o.fecha).toLocaleString('es-CO'),
            Cliente: o.cliente.nombre,
            Telefono: o.cliente.telefono || '-',
            Direccion: o.cliente.direccion || 'Local',
            MetodoPago: o.cliente.metodoPago,
            Productos: o.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', '),
            Total: o.total,
            Estado: o.estado
        }));

        // Crear Libro de Excel
        const workSheet = XLSX.utils.json_to_sheet(datosExcel);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Ventas");

        const excelBuffer = XLSX.write(workBook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Disposition', 'attachment; filename=Cierre_Caja.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).send("Error generando Excel");
    }
});

// 3. CERRAR CAJA (BORRAR TODO)
app.delete('/api/ventas/cerrar', async (req, res) => {
    try {
        // ¡PELIGRO! Esto borra todas las órdenes para empezar de cero
        await Order.deleteMany({}); 
        res.json({ message: "✅ Caja cerrada y datos borrados correctamente." });
    } catch (error) {
        res.status(500).json({ message: "Error cerrando caja", error });
    }
});

// --- 4. INTEGRACIÓN CON FRONTEND ---
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`--- SERVIDOR PUNTO CHINO CORRIENDO EN PUERTO ${PORT} ---`);
});