require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx'); 
const jwt = require('jsonwebtoken'); 

const Order = require('./models/OrderModel');
const Product = require('./models/ProductModel');
const Cierre = require('./models/CierreModel');
const Gasto = require('./models/GastoModel'); // <--- 1. IMPORTAMOS EL MODELO

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET; 

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🟢 Servidor conectado a MongoDB Atlas'))
    .catch(err => console.error('🔴 Error conectando a Mongo:', err));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// --- MIDDLEWARE ---
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "Token requerido" });
    try {
        const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) { return res.status(401).json({ message: "Token inválido" }); }
};

// --- LOGIN (Roles Corregidos) ---
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: 'admin', message: "Bienvenido Jefe" });
    } else if (password === process.env.MESERA_PASSWORD) {
        const token = jwt.sign({ role: 'mesera' }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, role: 'mesera', message: "Turno iniciado" });
    } else {
        res.status(401).json({ message: "Contraseña incorrecta" });
    }
});

// --- API GASTOS (NUEVO) ---
app.post('/api/gastos', verifyToken, async (req, res) => {
    try {
        const nuevoGasto = new Gasto(req.body);
        await nuevoGasto.save();
        res.status(201).json(nuevoGasto);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/gastos/hoy', async (req, res) => {
    // Solo gastos del turno actual (los que no se han cerrado)
    const gastos = await Gasto.find({ cierre_id: null }).sort({ fecha: -1 });
    res.json(gastos);
});

app.delete('/api/gastos/:id', verifyToken, async (req, res) => {
    await Gasto.findByIdAndDelete(req.params.id);
    res.json({ message: 'Gasto eliminado' });
});

// --- API VENTAS Y CIERRE (MODIFICADO) ---

// 1. RESUMEN EN TIEMPO REAL
app.get('/api/ventas/hoy', async (req, res) => {
    try {
        // Sumar Ventas
        const ordenes = await Order.find({ cierre_id: null });
        const totalVentas = ordenes.reduce((acc, o) => acc + o.total, 0);
        
        // Sumar Gastos
        const gastos = await Gasto.find({ cierre_id: null });
        const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0);

        // La caja debe tener: Ventas - Gastos
        res.json({ 
            totalVentas, 
            totalGastos, 
            totalCaja: totalVentas - totalGastos, 
            cantidadPedidos: ordenes.length 
        });
    } catch (error) { res.status(500).json({ message: "Error", error }); }
});

// 2. CERRAR CAJA INTELIGENTE
app.post('/api/ventas/cerrar', verifyToken, async (req, res) => {
    try {
        const { efectivoReal } = req.body;
        
        const ordenesAbiertas = await Order.find({ cierre_id: null });
        const gastosAbiertos = await Gasto.find({ cierre_id: null });

        if (ordenesAbiertas.length === 0 && gastosAbiertos.length === 0) {
            return res.status(400).json({ message: "No hay movimientos para cerrar" });
        }

        const totalVentas = ordenesAbiertas.reduce((acc, o) => acc + o.total, 0);
        const totalGastos = gastosAbiertos.reduce((acc, g) => acc + g.monto, 0);
        
        // Fórmula Anti-Robo:
        const totalCajaTeorico = totalVentas - totalGastos;
        const diferencia = Number(efectivoReal) - totalCajaTeorico;

        const fechaInicio = ordenesAbiertas.length > 0 ? ordenesAbiertas[0].fecha : new Date();

        const nuevoCierre = new Cierre({
            fechaInicio,
            totalVentasSistema: totalVentas,
            totalGastos: totalGastos,
            totalCajaTeorico: totalCajaTeorico,
            totalEfectivoReal: Number(efectivoReal),
            diferencia: diferencia,
            cantidadPedidos: ordenesAbiertas.length,
            usuario: "Admin" // O req.user.role
        });

        const cierreGuardado = await nuevoCierre.save();

        // Archivamos todo bajo este cierre
        await Order.updateMany({ cierre_id: null }, { $set: { cierre_id: cierreGuardado._id } });
        await Gasto.updateMany({ cierre_id: null }, { $set: { cierre_id: cierreGuardado._id } });

        res.json({ message: "Cierre exitoso", reporte: cierreGuardado });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error interno" });
    }
});

// --- API PRODUCTOS (Sin cambios) ---
app.get('/api/productos', async (req, res) => {
    const productos = await Product.find().sort({ id: 1 }); res.json(productos);
});
app.post('/api/productos', verifyToken, async (req, res) => {
    const nuevo = new Product(req.body); await nuevo.save(); res.json(nuevo);
});
app.put('/api/productos/:id', verifyToken, async (req, res) => {
    const act = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }); res.json(act);
});
app.delete('/api/productos/:id', verifyToken, async (req, res) => {
    await Product.findOneAndDelete({ id: req.params.id }); res.json({ message: 'Producto eliminado' });
});

// --- API PEDIDOS (Sin cambios) ---
app.post('/api/orders', async (req, res) => {
    const nuevaOrden = new Order(req.body); await nuevaOrden.save(); res.status(201).json(nuevaOrden);
});
app.get('/api/orders', async (req, res) => {
    const ordenes = await Order.find({ estado: 'Pendiente', cierre_id: null }).sort({ fecha: -1 }); res.json(ordenes);
});
app.put('/api/orders/:id', async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { estado: 'Completado' }); res.json({ message: 'Orden completada' });
});

// EXCEL (Simplificado)
app.get('/api/ventas/excel', verifyToken, async (req, res) => {
    const ordenes = await Order.find({ cierre_id: null }).lean();
    const granTotal = ordenes.reduce((acc, o) => acc + o.total, 0);
    const datosExcel = ordenes.map(o => ({
        Fecha: new Date(o.fecha).toLocaleString('es-CO'),
        Cliente: o.cliente.nombre,
        Total: o.total
    }));
    datosExcel.push({ Cliente: 'TOTAL', Total: granTotal });
    const workSheet = XLSX.utils.json_to_sheet(datosExcel);
    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "Ventas");
    const excelBuffer = XLSX.write(workBook, { bookType: 'xlsx', type: 'buffer' });
    res.setHeader('Content-Disposition', 'attachment; filename=Cierre.xlsx');
    res.send(excelBuffer);
});

// FRONTEND
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, '../client/dist/index.html')));

app.listen(PORT, () => console.log(`--- SERVIDOR V2 (GASTOS) PUERTO ${PORT} ---`));