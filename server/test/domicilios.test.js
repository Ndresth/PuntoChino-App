const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp, servir, token, tarifas } = require('./helpers');
const { normalizarDireccion, DOMICILIO_MINIMO } = require('../lib/domicilios');
const Product = require('../models/ProductModel');
const Order = require('../models/OrderModel');
const Counter = require('../models/CounterModel');
const Config = require('../models/ConfigModel');

test('normalizarDireccion: misma dirección escrita de otra forma', () => {
    const a = normalizarDireccion('Cra. 12 # 45-30, Barrio Centro');
    assert.equal(a, normalizarDireccion('carrera 12 no 45 30 barrio centro'));
    assert.equal(a, normalizarDireccion('KR 12 N° 45 - 30 Centro'));
    assert.equal(normalizarDireccion('Calle 45 B # 38-21'), normalizarDireccion('cll 45b 38 21'));
    assert.notEqual(normalizarDireccion('Calle 45 # 38-21'), normalizarDireccion('Calle 45 # 38-22'));
    assert.equal(normalizarDireccion('   '), '');
});

// BD simulada
Product.find = (q) => ({ lean: async () => [{ id: 1, nombre: 'Arroz Paisa', categoria: 'Arroz Frito', precios: { familiar: 50000 } }].filter(p => q.id.$in.includes(p.id)) });
Counter.next = async () => 1;
Order.create = async (o) => ({ _id: 'x', ...o });
Config.findById = () => ({ lean: async () => null });
let orden = null;
Order.findOne = () => ({ lean: async () => orden });
Order.findOneAndUpdate = async (filtro, cambios) => {
    if (filtro.total !== orden.total) return null;
    const nueva = structuredClone(orden);
    for (const [k, v] of Object.entries(cambios.$set)) {
        if (k === 'cliente.metodoPago') nueva.cliente.metodoPago = v; else nueva[k] = v;
    }
    if (cambios.$unset?.pagos) delete nueva.pagos;
    return nueva;
};

test('valor del domicilio', async (t) => {
    const api = await servir(crearApp({ '/api/orders': require('../routes/orders') }));
    t.after(api.cerrar);
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-23T17:00:00Z') }); // abierto
    const mesera = token({ role: 'mesera', nombre: 'Luz' });
    const cajero = token({ role: 'cajero', nombre: 'Pedro' });
    const id = '507f1f77bcf86cd799439011';
    const pedido = (direccion, extra = {}) => ({
        tipo: 'Domicilio', cliente: { nombre: 'Ana', telefono: '3001234567', direccion }, items: [{ productoId: 1, tamaño: 'familiar', cantidad: 1 }], ...extra
    });

    await t.test('POS: el valor se suma al total y queda aprendido para esa dirección', async () => {
        const [st, o] = await api.post('/api/orders', { token: mesera, body: pedido('Cra 12 # 45-30', { valorDomicilio: 4000 }) });
        assert.equal(st, 201);
        assert.equal(o.valorDomicilio, 4000);
        assert.equal(o.total, 54000);
        assert.equal(tarifas.get(normalizarDireccion('carrera 12 45 30')).valor, 4000);
    });

    await t.test('POS: no acepta menos del mínimo del restaurante', async () => {
        const [st, e] = await api.post('/api/orders', { token: mesera, body: pedido('Cl 1', { valorDomicilio: DOMICILIO_MINIMO - 100 }) });
        assert.equal(st, 400);
        assert.match(e.message, /mínimo/);
    });

    await t.test('web: dirección conocida trae su valor; dirección nueva queda pendiente para caja', async () => {
        const [, conocida] = await api.post('/api/orders', { body: pedido('Carrera 12 No. 45 - 30') });
        assert.equal(conocida.valorDomicilio, 4000);
        assert.equal(conocida.total, 54000);
        const [, nueva] = await api.post('/api/orders', { body: pedido('Cl 99 # 1-1', { valorDomicilio: 1 }) }); // la web no puede poner valor
        assert.equal(nueva.valorDomicilio, undefined);
        assert.equal(nueva.total, 50000);
    });

    await t.test('POS consulta el valor guardado al escribir la dirección', async () => {
        const [st, r] = await api.get(`/api/orders/domicilio/tarifa?direccion=${encodeURIComponent('kr 12 #45-30')}`, { token: mesera });
        assert.equal(st, 200);
        assert.deepEqual(r, { valor: 4000, minimo: DOMICILIO_MINIMO });
        assert.equal((await api.get('/api/orders/domicilio/tarifa?direccion=x')).at(0), 401);
    });

    await t.test('caja pone el valor en Órdenes: ajusta el total y lo aprende', async () => {
        orden = { _id: id, tipo: 'Domicilio', estado: 'Pendiente', total: 50000, cliente: { direccion: 'Cl 99 # 1-1', metodoPago: 'Efectivo' }, items: [] };
        assert.equal((await api.patch(`/api/orders/${id}/domicilio`, { token: mesera, body: { valor: 5000 } }))[0], 403);
        const [st, r] = await api.patch(`/api/orders/${id}/domicilio`, { token: cajero, body: { valor: 5000 } });
        assert.equal(st, 200);
        assert.equal(r.orden.total, 55000);
        assert.equal(r.orden.valorDomicilio, 5000);
        assert.equal(tarifas.get(normalizarDireccion('calle 99 1 1')).valor, 5000);

        // Corregir: reemplaza el valor anterior (no lo suma dos veces) y reinicia un pago dividido
        orden = { ...r.orden, cliente: { ...r.orden.cliente, metodoPago: 'Mixto' }, pagos: [{ metodo: 'Efectivo', monto: 15000 }, { metodo: 'Nequi', monto: 40000 }] };
        const [, r2] = await api.patch(`/api/orders/${id}/domicilio`, { token: cajero, body: { valor: 6000 } });
        assert.equal(r2.orden.total, 56000);
        assert.equal(r2.pagoReiniciado, true);
        assert.equal(r2.orden.cliente.metodoPago, 'Nequi');
    });

    await t.test('caja: solo domicilios activos y desde el mínimo', async () => {
        orden = { _id: id, tipo: 'Mesa', estado: 'Pendiente', total: 1000, cliente: {}, items: [] };
        assert.equal((await api.patch(`/api/orders/${id}/domicilio`, { token: cajero, body: { valor: 5000 } }))[0], 400);
        orden = { _id: id, tipo: 'Domicilio', estado: 'Cancelado', total: 1000, cliente: {}, items: [] };
        assert.equal((await api.patch(`/api/orders/${id}/domicilio`, { token: cajero, body: { valor: 5000 } }))[0], 409);
        orden.estado = 'Pendiente';
        assert.equal((await api.patch(`/api/orders/${id}/domicilio`, { token: cajero, body: { valor: 0 } }))[0], 400);
    });
});
