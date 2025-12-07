require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx'); 
const jwt = require('jsonwebtoken'); // Importamos la seguridad

const Order = require('./models/OrderModel');
const Product = require('./models/ProductModel');
const Cierre = require('./models/CierreModel');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET; // Llave maestra del .env

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 Servidor conectado a MongoDB Atlas'))
    .catch(err => console.error('🔴 Error conectando a Mongo:', err));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// --- MIDDLEWARE DE SEGURIDAD (EL GUARDIA) ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "No tienes llave (Token requerido)" });

    try {
        const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
        req.user = decoded;
        next(); // Si la llave sirve, pasa.
    } catch (err) {
        return res.status(401).json({ message: "Llave falsa o vencida" });
    }
};

// --- LOGIN MULTI-ROL (DAR LLAVE SEGÚN QUIÉN ERES) ---
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;

    if (password === process.env.ADMIN_PASSWORD) {
        // Si es la clave del JEFE, le damos rol 'admin'
        const token = jwt.sign({ role: 'Admin' }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: 'Admin', message: "Bienvenido Jefe" });

    } else if (password === process.env.MESERA_PASSWORD) {
        // Si es la clave de MESERA, le damos rol 'mesera'
        const token = jwt.sign({ role: 'mesera' }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: 'mesera', message: "Turno iniciado" });

    } else {
        res.status(401).json({ message: "Contraseña incorrecta" });
    }
});

// --- API PRODUCTOS ---
// GET es público (el menú lo ve todo el mundo)
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Product.find().sort({ id: 1 });
        res.json(productos);
    } catch (error) { res.status(500).json({ message: "Error", error }); }
});

// POST, PUT, DELETE son privados (Solo con verifyToken)
app.post('/api/productos', verifyToken, async (req, res) => {
    try {
        const nuevoProducto = new Product(req.body);
        await nuevoProducto.save();
        res.status(201).json(nuevoProducto);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

app.put('/api/productos/:id', verifyToken, async (req, res) => {
    try {
        const actualizado = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(actualizado);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

app.delete('/api/productos/:id', verifyToken, async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Producto eliminado' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- API PEDIDOS (Público para que clientes/meseros pidan) ---
app.post('/api/orders', async (req, res) => {
    try {
        const nuevaOrden = new Order(req.body);
        await nuevaOrden.save();
        res.status(201).json(nuevaOrden);
    } catch (error) { res.status(400).json({ message: "Error al guardar", error }); }
});

app.get('/api/orders', async (req, res) => {
    try {
        const ordenes = await Order.find({ estado: 'Pendiente', cierre_id: null }).sort({ fecha: -1 });
        res.json(ordenes);
    } catch (error) { res.status(500).json({ message: "Error al leer", error }); }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        await Order.findByIdAndUpdate(req.params.id, { estado: 'Completado' });
        res.json({ message: 'Orden completada' });
    } catch (error) { res.status(500).json({ message: "Error", error }); }
});

// --- ZONA FINANCIERA (PROTEGIDA) ---

// VER VENTAS HOY (Público o Privado según prefieras, dejémoslo público para el dashboard rápido)
app.get('/api/ventas/hoy', async (req, res) => {
    try {
        const ordenes = await Order.find({ cierre_id: null });
        const totalVentas = ordenes.reduce((acc, orden) => acc + orden.total, 0);
        res.json({ total: totalVentas, cantidadPedidos: ordenes.length });
    } catch (error) {
        res.status(500).json({ message: "Error calculando ventas", error });
    }
});

// DESCARGAR EXCEL (PROTEGIDO)
app.get('/api/ventas/excel', verifyToken, async (req, res) => {
    try {
        const ordenes = await Order.find({ cierre_id: null }).lean();
        const granTotal = ordenes.reduce((acc, o) => acc + o.total, 0);

        const datosExcel = ordenes.map(o => ({
            Fecha: new Date(o.fecha).toLocaleString('es-CO'),
            Cliente: o.cliente.nombre,
            MetodoPago: o.cliente.metodoPago,
            Productos: o.items.map(i => `${i.cantidad}x ${i.nombre} ${i.tamaño && i.tamaño !== 'unico' ? `(${i.tamaño})` : ''}`).join(', '),
            Total: o.total
        }));

        datosExcel.push({
            Fecha: '', Cliente: '--- TOTAL CIERRE ---', MetodoPago: '', Productos: '', Total: granTotal
        });

        const workSheet = XLSX.utils.json_to_sheet(datosExcel);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Ventas");

        const excelBuffer = XLSX.write(workBook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Disposition', 'attachment; filename=Cierre_Caja.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);

    } catch (error) {
        res.status(500).send("Error generando Excel");
    }
});

// CERRAR CAJA (PROTEGIDO - NIVEL MÁXIMO)
app.post('/api/ventas/cerrar', verifyToken, async (req, res) => {
    try {
        const { efectivoReal } = req.body;
        const ordenesAbiertas = await Order.find({ cierre_id: null });

        if (ordenesAbiertas.length === 0) return res.status(400).json({ message: "No hay ventas para cerrar" });

        const totalSistema = ordenesAbiertas.reduce((acc, orden) => acc + orden.total, 0);
        const fechaInicio = ordenesAbiertas[0].fecha;

        const nuevoCierre = new Cierre({
            fechaInicio: fechaInicio,
            totalVentasSistema: totalSistema,
            totalEfectivoReal: Number(efectivoReal),
            diferencia: Number(efectivoReal) - totalSistema,
            cantidadPedidos: ordenesAbiertas.length,
            usuario: "Admin"
        });

        const cierreGuardado = await nuevoCierre.save();

        await Order.updateMany(
            { cierre_id: null }, 
            { $set: { cierre_id: cierreGuardado._id } }
        );

        res.json({ message: "Cierre exitoso", reporte: cierreGuardado });

    } catch (error) {
        console.error("Error cerrando caja:", error);
        res.status(500).json({ message: "Error interno", error });
    }
});

// --- FRONTEND ---
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`--- SERVIDOR SEGURO CORRIENDO EN PUERTO ${PORT} ---`);
});