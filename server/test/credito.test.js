const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp, servir, token } = require('./helpers');
const { validarPagos, METODOS_CREDITO } = require('../lib/pagos');
const Product = require('../models/ProductModel');
const Order = require('../models/OrderModel');
const Gasto = require('../models/GastoModel');
const Counter = require('../models/CounterModel');
const Config = require('../models/ConfigModel');

// BD simulada
Product.find = (q) => ({ lean: async () => [{ id: 1, nombre: 'Arroz Paisa', categoria: 'Arroz Frito', precios: { familiar: 50000 } }].filter(p => q.id.$in.includes(p.id)) });
Counter.next = async () => 1;
Order.create = async (o) => ({ _id: 'x', ...o });
Config.findById = () => ({ lean: async () => null });
let turno = [];
Order.find = () => ({ select: () => ({ lean: async () => turno }) });
Gasto.find = () => ({ select: () => ({ lean: async () => [{ monto: 5000 }] }) });

test('Rappi y Didi: nota crédito que paga la plataforma (Rappi a 15 días, Didi a 1 semana)', () => {
    assert.deepEqual(METODOS_CREDITO, { Rappi: 15, Didi: 7 });
    assert.deepEqual(validarPagos([{ metodo: 'Rappi', monto: 30000 }, { metodo: 'Efectivo', monto: 20000 }], 50000),
        [{ metodo: 'Rappi', monto: 30000 }, { metodo: 'Efectivo', monto: 20000 }]);
});

test('Rappi y Didi en el POS y en caja', async (t) => {
    const api = await servir(crearApp({ '/api/orders': require('../routes/orders'), '/api': require('../routes/caja') }));
    t.after(api.cerrar);
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-23T17:00:00Z') }); // abierto
    const mesera = token({ role: 'mesera', nombre: 'Luz' });
    const cajero = token({ role: 'cajero', nombre: 'Pedro' });
    const items = [{ productoId: 1, tamaño: 'familiar', cantidad: 1 }];

    await t.test('solo el POS puede usarlos; en la web quedan como efectivo', async () => {
        const [, pos] = await api.post('/api/orders', { token: mesera, body: { tipo: 'Llevar', cliente: { nombre: 'Rappi 123', metodoPago: 'Rappi' }, items } });
        assert.equal(pos.cliente.metodoPago, 'Rappi');
        const [, didi] = await api.post('/api/orders', { token: mesera, body: { tipo: 'Llevar', cliente: { metodoPago: 'Didi' }, items } });
        assert.equal(didi.cliente.metodoPago, 'Didi');
        const [, web] = await api.post('/api/orders', { body: { tipo: 'Llevar', cliente: { nombre: 'Ana', telefono: '3001234567', metodoPago: 'Rappi' }, items } });
        assert.equal(web.cliente.metodoPago, 'Efectivo');
    });

    await t.test('caja: cuentan como venta y quedan por cobrar, no como efectivo en el cajón', async () => {
        turno = [
            { total: 50000, estado: 'Completado', cliente: { metodoPago: 'Efectivo' } },
            { total: 40000, estado: 'Completado', cliente: { metodoPago: 'Rappi' } },
            { total: 30000, estado: 'Completado', cliente: { metodoPago: 'Mixto' }, pagos: [{ metodo: 'Didi', monto: 20000 }, { metodo: 'Efectivo', monto: 10000 }] },
            { total: 99000, estado: 'Cancelado', cliente: { metodoPago: 'Rappi' } }
        ];
        const [st, b] = await api.get('/api/ventas/hoy', { token: cajero });
        assert.equal(st, 200);
        assert.equal(b.totalVentas, 120000);
        assert.deepEqual(b.porCobrar, { Rappi: 40000, Didi: 20000 });
        assert.equal(b.totalPorCobrar, 60000);
        assert.equal(b.totalCaja, 60000 - 5000); // efectivo 50.000 + 10.000 menos gastos
    });
});
