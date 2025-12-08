require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx'); 
const jwt = require('jsonwebtoken'); 

// Importación de Modelos de Datos
const Order = require('./models/OrderModel');
const Product = require('./models/ProductModel');
const Cierre = require('./models/CierreModel');
const Gasto = require('./models/GastoModel');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET; 

// --- CONFIGURACIÓN DE BASE DE DATOS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('[INFO] Conexión a MongoDB establecida exitosamente.'))
    .catch(err => console.error('[FATAL] Error de conexión a MongoDB:', err));

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

/**
 * Middleware de Verificación de Token (JWT).
 * Protege las rutas administrativas validando la cabecera Authorization.
 */
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: "Acceso denegado: Token de autorización requerido." });
    
    try {
        const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Acceso denegado: Token inválido o expirado." });
    }
};

// --- MÓDULO DE AUTENTICACIÓN ---
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    
    if (password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
        console.log(`[AUTH] Inicio de sesión: Administrador`);
        res.json({ token, role: 'admin', message: "Sesión iniciada correctamente (Admin)." });
    } else if (password === process.env.MESERA_PASSWORD) {
        const token = jwt.sign({ role: 'mesera' }, SECRET_KEY, { expiresIn: '24h' });
        console.log(`[AUTH] Inicio de sesión: Personal POS`);
        res.json({ token, role: 'mesera', message: "Sesión iniciada correctamente (POS)." });
    } else {
        console.warn(`[AUTH] Intento de acceso fallido.`);
        res.status(401).json({ message: "Credenciales incorrectas." });
    }
});

// --- MÓDULO DE GASTOS ---
app.post('/api/gastos', verifyToken, async (req, res) => {
    try {
        const nuevoGasto = new Gasto(req.body);
        await nuevoGasto.save();
        res.status(201).json(nuevoGasto);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/gastos/hoy', async (req, res) => {
    // Retorna gastos activos del turno actual (sin cierre asociado)
    const gastos = await Gasto.find({ cierre_id: null }).sort({ fecha: -1 });
    res.json(gastos);
});

app.delete('/api/gastos/:id', verifyToken, async (req, res) => {
    await Gasto.findByIdAndDelete(req.params.id);
    res.json({ message: 'Registro de gasto eliminado.' });
});

// --- MÓDULO FINANCIERO Y CIERRE ---

/**
 * Obtiene el balance en tiempo real del turno actual.
 * Retorna: Ventas Brutas, Gastos Totales, y Efectivo Teórico en Caja.
 */
app.get('/api/ventas/hoy', async (req, res) => {
    try {
        const ordenes = await Order.find({ cierre_id: null });
        const totalVentas = ordenes.reduce((acc, o) => acc + o.total, 0);
        
        const gastos = await Gasto.find({ cierre_id: null });
        const totalGastos = gastos.reduce((acc, g) => acc + g.monto, 0);

        res.json({ 
            totalVentas, 
            totalGastos, 
            totalCaja: totalVentas - totalGastos, 
            cantidadPedidos: ordenes.length 
        });
    } catch (error) { res.status(500).json({ message: "Error interno al calcular balance.", error }); }
});

/**
 * Procesa el Cierre de Caja (Arqueo).
 * 1. Calcula totales teóricos.
 * 2. Compara con efectivo real declarado.
 * 3. Genera registro de auditoría (Cierre).
 * 4. Archiva órdenes y gastos del turno.
 */
app.post('/api/ventas/cerrar', verifyToken, async (req, res) => {
    try {
        const { efectivoReal } = req.body;
        
        const ordenesAbiertas = await Order.find({ cierre_id: null });
        const gastosAbiertos = await Gasto.find({ cierre_id: null });

        if (ordenesAbiertas.length === 0 && gastosAbiertos.length === 0) {
            return res.status(400).json({ message: "No existen movimientos pendientes para cerrar." });
        }

        const totalVentas = ordenesAbiertas.reduce((acc, o) => acc + o.total, 0);
        const totalGastos = gastosAbiertos.reduce((acc, g) => acc + g.monto, 0);
        const totalCajaTeorico = totalVentas - totalGastos;
        
        // Cálculo de diferencia (Conciliación)
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
            usuario: "Admin" 
        });

        const cierreGuardado = await nuevoCierre.save();

        // Archivar transacciones
        await Order.updateMany({ cierre_id: null }, { $set: { cierre_id: cierreGuardado._id } });
        await Gasto.updateMany({ cierre_id: null }, { $set: { cierre_id: cierreGuardado._id } });

        console.log(`[AUDIT] Caja cerrada. Diferencia: ${diferencia}`);
        res.json({ message: "Cierre de caja procesado correctamente.", reporte: cierreGuardado });

    } catch (error) {
        console.error('[ERROR] Fallo en proceso de cierre:', error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
});

// --- HISTORIAL DE REPORTES ---
app.get('/api/cierres', verifyToken, async (req, res) => {
    try {
        const cierres = await Cierre.find().sort({ fechaFin: -1 }).limit(30);
        res.json(cierres);
    } catch (error) {
        res.status(500).json({ message: "Error al recuperar historial.", error });
    }
});

// --- GESTIÓN DE PRODUCTOS ---
app.get('/api/productos', async (req, res) => {
    const productos = await Product.find().sort({ id: 1 });
    res.json(productos);
});

app.post('/api/productos', verifyToken, async (req, res) => {
    try {
        const nuevo = new Product(req.body);
        await nuevo.save();
        res.status(201).json(nuevo);
    } catch (err) { res.status(400).json({ message: err.message }); }
});

app.put('/api/productos/:id', verifyToken, async (req, res) => {
    const act = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(act);
});

app.delete('/api/productos/:id', verifyToken, async (req, res) => {
    await Product.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'Producto eliminado del inventario.' });
});

// --- GESTIÓN DE ÓRDENES ---
app.post('/api/orders', async (req, res) => {
    try {
        const nuevaOrden = new Order(req.body);
        await nuevaOrden.save();
        res.status(201).json(nuevaOrden);
    } catch (err) { res.status(400).json({ message: "Error al crear orden." }); }
});

app.get('/api/orders', async (req, res) => {
    // Retorna órdenes pendientes del turno actual
    const ordenes = await Order.find({ estado: 'Pendiente', cierre_id: null }).sort({ fecha: -1 });
    res.json(ordenes);
});

app.put('/api/orders/:id', async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { estado: 'Completado' });
    res.json({ message: 'Orden actualizada.' });
});

// --- EXPORTACIÓN DE DATOS (EXCEL) ---
app.get('/api/ventas/excel', verifyToken, async (req, res) => {
    try {
        const ordenes = await Order.find({ cierre_id: null }).lean();
        const granTotal = ordenes.reduce((acc, o) => acc + o.total, 0);
        
        const datosExcel = ordenes.map(o => ({
            Fecha: new Date(o.fecha).toLocaleString('es-CO'),
            Cliente: o.cliente.nombre,
            MetodoPago: o.cliente.metodoPago,
            Items: o.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', '),
            Total: o.total
        }));
        
        datosExcel.push({ Fecha: '', Cliente: 'TOTAL TURNO', Total: granTotal });

        const workSheet = XLSX.utils.json_to_sheet(datosExcel);
        const workBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workBook, workSheet, "Ventas");

        const excelBuffer = XLSX.write(workBook, { bookType: 'xlsx', type: 'buffer' });
        
        res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Cierre.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
    } catch (error) {
        res.status(500).send("Error generando el archivo de reporte.");
    }
});

// --- SERVIDOR FRONTEND ---
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// INICIO DEL SERVIDOR
app.listen(PORT, () => {
    console.log(`[INFO] Servidor ejecutándose en el puerto ${PORT}`);
});