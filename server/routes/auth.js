const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { ROLES, signToken } = require('../middleware/auth');
const { cleanText } = require('../lib/util');

const router = express.Router();

// Máximo 10 intentos fallidos cada 15 minutos por IP (freno a fuerza bruta)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Demasiados intentos. Espere 15 minutos e intente de nuevo.' }
});

// Comparación en tiempo constante (evita ataques de tiempo)
const safeEqual = (a, b) => {
    if (!a || !b) return false;
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
};

const CREDENCIALES = [
    { role: ROLES.ADMIN, env: 'ADMIN_PASSWORD', message: 'Bienvenido Admin' },
    { role: ROLES.CAJERO, env: 'CAJERO_PASSWORD', message: 'Turno de Caja Iniciado' },
    { role: ROLES.MESERA, env: 'MESERA_PASSWORD', message: 'Bienvenido POS' },
    { role: ROLES.COCINA, env: 'COCINA_PASSWORD', message: 'Pantalla de Cocina' }
];

router.post('/login', loginLimiter, (req, res) => {
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const nombre = cleanText(req.body?.nombre, 40);

    const match = CREDENCIALES.find(c => safeEqual(password, process.env[c.env]));
    if (!match) return res.status(401).json({ message: 'Credenciales inválidas' });

    const usuario = nombre || match.role.charAt(0).toUpperCase() + match.role.slice(1);
    const token = signToken({ role: match.role, nombre: usuario });
    res.json({ token, role: match.role, nombre: usuario, message: match.message });
});

module.exports = router;
