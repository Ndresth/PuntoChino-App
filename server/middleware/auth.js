const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;

const ROLES = {
    ADMIN: 'admin',
    CAJERO: 'cajero',
    MESERA: 'mesera',
    COCINA: 'cocina'
};
const STAFF = Object.values(ROLES);

const readToken = (req) => {
    const header = req.headers['authorization'] || '';
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
};

/** Exige un token válido. Si se pasan roles, exige además uno de ellos. */
const requireAuth = (...roles) => (req, res, next) => {
    const token = readToken(req);
    if (!token) return res.status(401).json({ message: 'Acceso denegado. Token requerido.' });
    try {
        req.user = jwt.verify(token, SECRET_KEY);
    } catch {
        return res.status(401).json({ message: 'Sesión expirada. Inicie sesión de nuevo.' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'No tiene permisos para esta acción.' });
    }
    next();
};

/** Adjunta req.user si viene un token válido, pero no lo exige. */
const optionalAuth = (req, res, next) => {
    const token = readToken(req);
    if (token) {
        try { req.user = jwt.verify(token, SECRET_KEY); } catch { /* token inválido: se trata como anónimo */ }
    }
    next();
};

const signToken = (payload) => jwt.sign(payload, SECRET_KEY, { expiresIn: '14h' });

module.exports = { ROLES, STAFF, requireAuth, optionalAuth, signToken };
