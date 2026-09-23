require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');

const { requireAuth, STAFF } = require('./middleware/auth');
const events = require('./lib/events');
const horario = require('./lib/horario');

// --- VALIDACIÓN DE CONFIGURACIÓN ---
for (const key of ['MONGO_URI', 'JWT_SECRET']) {
    if (!process.env[key]) {
        console.error(`[FATAL] Falta la variable de entorno ${key}`);
        process.exit(1);
    }
}
if (process.env.JWT_SECRET.length < 32) {
    console.warn('[WARN] JWT_SECRET es corto. Use al menos 32 caracteres aleatorios.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN BD ---
mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 10000 })
    .then(() => console.log('[INFO] Conexión a MongoDB establecida.'))
    .catch(err => console.error('[FATAL] Error de conexión a MongoDB:', err.message));

// --- SEGURIDAD Y RENDIMIENTO ---
app.set('trust proxy', 1); // Render está detrás de un proxy: necesario para el rate limit por IP
app.disable('x-powered-by');

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// La compresión no debe tocar el stream SSE (lo bufferizaría)
app.use(compression({
    filter: (req, res) => req.path !== '/api/stream' && compression.filter(req, res)
}));

// Front y API viven en el mismo dominio, así que CORS sólo se abre si se configura
if (process.env.CORS_ORIGIN) {
    app.use(cors({ origin: process.env.CORS_ORIGIN.split(',').map(s => s.trim()) }));
}

app.use(express.json({ limit: '100kb' }));

// --- API ---
app.get('/api/health', (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
app.use('/api/auth', require('./routes/auth'));
app.get('/api/horario', (req, res) => {
    const e = horario.estado();
    res.set('Cache-Control', 'no-store');
    res.json({ ahora: e.ahora, abierto: e.abierto, hoy: e.hoy, proxima: e.proxima, horario: horario.HORARIO });
});
app.use('/api/productos', require('./routes/productos'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reportes', require('./routes/reportes'));
app.use('/api', require('./routes/caja'));

// Tiempo real (cocina, POS, caja)
app.get('/api/stream', requireAuth(...STAFF), events.subscribe);

app.use('/api', (req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// --- MANEJO CENTRAL DE ERRORES ---
// Express 5 envía aquí automáticamente los errores de las rutas async
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
    if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Petición demasiado grande' });
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: 'Datos inválidos' });
    console.error('[ERROR]', req.method, req.path, err);
    res.status(500).json({ message: 'Error interno del servidor' });
});

// --- FRONTEND ---
const dist = path.join(__dirname, '../client/dist');
// Archivos con hash de Vite: caché de 1 año. Imágenes: 7 días. index.html: siempre fresco.
// fallthrough: false -> un archivo viejo (pestaña abierta antes de un deploy) da 404 en vez de index.html,
// así el navegador detecta el fallo de carga y la app se recarga sola.
app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
app.use('/images', express.static(path.join(dist, 'images'), { maxAge: '7d' }));
app.use(express.static(dist, { index: false, maxAge: '1h' }));
app.get(/.*/, (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
});

app.listen(PORT, () => console.log(`[INFO] Server on port ${PORT}`));
