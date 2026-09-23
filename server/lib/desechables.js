/**
 * Desechables que se pueden agregar a cualquier pedido.
 * El precio y los límites se validan SIEMPRE aquí (el cliente sólo envía cantidades).
 * Si cambia un precio o límite, actualice también client/src/config.js (DESECHABLES).
 */
const DESECHABLES = {
    cucharas: { nombre: 'Cuchara', precio: 0, max: 6 },
    platos: { nombre: 'Plato desechable', precio: 300, max: 10 },
    vasos: { nombre: 'Vaso', precio: 0, max: 6, soloConBebida: true } // Sólo si el pedido trae una bebida
};

const CATEGORIA_BEBIDAS = 'Bebidas';

/** Convierte { cucharas, platos } en ítems de la orden. Lanza si excede los límites. */
const buildDesechables = (raw = {}, HttpError, { tieneBebida = false } = {}) => {
    const items = [];
    for (const [key, cfg] of Object.entries(DESECHABLES)) {
        const cantidad = raw?.[key] === undefined || raw?.[key] === null || raw?.[key] === '' ? 0 : Number(raw[key]);
        if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > cfg.max) {
            throw new HttpError(400, `Máximo ${cfg.max} ${key}`);
        }
        if (cantidad > 0 && cfg.soloConBebida && !tieneBebida) {
            throw new HttpError(400, 'Los vasos sólo se agregan si el pedido tiene una bebida');
        }
        if (cantidad > 0) {
            items.push({ productoId: null, nombre: cfg.nombre, cantidad, precio: cfg.precio, tamaño: 'unico', nota: '', extra: true });
        }
    }
    return items;
};

module.exports = { DESECHABLES, CATEGORIA_BEBIDAS, buildDesechables };
