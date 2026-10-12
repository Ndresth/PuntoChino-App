const test = require('node:test');
const assert = require('node:assert/strict');
const { crearApp, servir, token } = require('./helpers');
const Product = require('../models/ProductModel');
const Order = require('../models/OrderModel');

// BD simulada
const PRODUCTOS = [
    { id: 1, nombre: 'Arroz Super Especial', categoria: 'Arroz Frito', precios: { familiar: 40000, mediano: 29000 } },
    { id: 75, nombre: 'Coca Cola 1.5', categoria: 'Bebidas', precios: { unico: 9000 } },
    { id: 2, nombre: 'Arroz Especial', categoria: 'Arroz Frito', precios: { familiar: 35000, mediano: 26000, personal: 19000 } },
    { id: 9, nombre: 'Agotado', categoria: 'Arroz Frito', precios: { mediano: 1000 }, disponible: false },
    { id: 50, nombre: 'Churrasco', categoria: 'Platos Especiales', precios: { unico: 34000 } }
];
Product.find = (q) => ({ lean: async () => PRODUCTOS.filter(p => q.id.$in.includes(p.id)) });
let orden = null;
let ultimo = null;
Order.findOne = () => ({ lean: async () => orden });
Order.findOneAndUpdate = async (filtro, cambios) => {
    ultimo = { filtro, cambios };
    if (filtro.total !== orden.total || filtro.items.$size !== orden.items.length) return null;
    const nueva = structuredClone(orden);
    for (const [k, v] of Object.entries(cambios.$set)) {
        if (k === 'cliente.metodoPago') nueva.cliente.metodoPago = v; else nueva[k] = v;
    }
    if (cambios.$push?.cambios) nueva.cambios = [...(nueva.cambios || []), cambios.$push.cambios];
    if (cambios.$unset?.pagos) delete nueva.pagos;
    return nueva;
};

const ID = '507f1f77bcf86cd799439011';
const base = () => ({
    _id: ID, numero: 12, tipo: 'Domicilio', estado: 'Listo', valorDomicilio: 3000, total: 41000,
    cliente: { nombre: 'Mayiris', metodoPago: 'Efectivo' },
    items: [
        { _id: 'a1', productoId: 1, nombre: 'Arroz Super Especial', cantidad: 1, precio: 29000, tamaño: 'mediano', extra: false },
        { _id: 'a2', productoId: 75, nombre: 'Coca Cola 1.5', cantidad: 1, precio: 9000, tamaño: 'unico', extra: false },
        { _id: 'a3', productoId: null, nombre: 'Cuchara', cantidad: 2, precio: 0, tamaño: 'unico', extra: true }
    ]
});

test('editar una orden', async (t) => {
    const api = await servir(crearApp({ '/api/orders': require('../routes/orders') }));
    t.after(api.cerrar);
    const cajero = token({ role: 'cajero', nombre: 'Pedro' });
    const mesera = token({ role: 'mesera', nombre: 'Luz' });
    const editar = (items, tk = cajero) => api.patch(`/api/orders/${ID}/items`, { token: tk, body: { items } });

    await t.test('cambiar 1/2 por entero: precio de la BD, total con domicilio y vuelve a cocina', async () => {
        orden = base();
        const [st, r] = await editar([{ id: 'a1', cantidad: 1, tamaño: 'familiar' }]);
        assert.equal(st, 200);
        const arroz = r.orden.items.find(i => i._id === 'a1');
        assert.equal(arroz.tamaño, 'familiar');
        assert.equal(arroz.precio, 40000);
        assert.ok(arroz.modificadoEn);
        assert.equal(r.orden.total, 40000 + 9000 + 3000);
        assert.equal(r.orden.estado, 'Pendiente'); // estaba Listo: hay que prepararlo de nuevo
        assert.deepEqual(r.detalle, ['Arroz Super Especial: 1/2 → 1']);
        assert.equal(r.orden.cambios.at(-1).por, 'Pedro');
        assert.equal(ultimo.filtro.items.$size, 3); // no pisa una adición simultánea
    });

    await t.test('quitar un producto y bajar cantidades no la devuelve a cocina', async () => {
        orden = base();
        const [st, r] = await editar([{ id: 'a2', cantidad: 0 }, { id: 'a3', cantidad: 1 }]);
        assert.equal(st, 200);
        assert.deepEqual(r.orden.items.map(i => i._id), ['a1', 'a3']);
        assert.equal(r.orden.total, 29000 + 3000);
        assert.equal(r.orden.estado, 'Listo');
        assert.deepEqual(r.detalle, ['Quitado: 1 Coca Cola 1.5', 'Cuchara: 2 → 1']);
    });

    await t.test('subir cantidad: "2 x 1/2" y reinicia un pago dividido', async () => {
        orden = { ...base(), estado: 'Preparando', cliente: { metodoPago: 'Mixto' }, pagos: [{ metodo: 'Efectivo', monto: 11000 }, { metodo: 'Nequi', monto: 30000 }] };
        const [, r] = await editar([{ id: 'a1', cantidad: 2 }]);
        assert.deepEqual(r.detalle, ['Arroz Super Especial: 1/2 → 2 x 1/2']);
        assert.equal(r.orden.total, 2 * 29000 + 9000 + 3000);
        assert.equal(r.pagoReiniciado, true);
        assert.equal(r.orden.cliente.metodoPago, 'Nequi');
    });

    await t.test('cambiar por otro producto: mismo tamaño, precio de la BD, conserva la nota', async () => {
        orden = base();
        orden.items[0].nota = 'Sin cebolla';
        const [st, r] = await editar([{ id: 'a1', cantidad: 1, productoId: 2 }]);
        assert.equal(st, 200);
        const arroz = r.orden.items.find(i => i._id === 'a1');
        assert.deepEqual([arroz.productoId, arroz.nombre, arroz.tamaño, arroz.precio, arroz.nota], [2, 'Arroz Especial', 'mediano', 26000, 'Sin cebolla']);
        assert.equal(r.orden.total, 26000 + 9000 + 3000);
        assert.deepEqual(r.detalle, ['1/2 Arroz Super Especial → 1/2 Arroz Especial']);
        assert.equal(r.orden.estado, 'Pendiente'); // cocina prepara otra cosa

        // Producto y tamaño a la vez; agotado o sin ese tamaño se rechaza
        orden = base();
        const [, r2] = await editar([{ id: 'a1', cantidad: 1, productoId: 2, tamaño: 'personal' }]);
        assert.deepEqual(r2.detalle, ['1/2 Arroz Super Especial → 1/4 Arroz Especial']);
        assert.equal((await editar([{ id: 'a1', cantidad: 1, productoId: 9 }]))[0], 409);
        assert.match((await editar([{ id: 'a1', cantidad: 1, productoId: 50 }]))[1].message, /Tamaño inválido para "Churrasco"/);
        assert.match((await editar([{ id: 'a1', cantidad: 1, productoId: 999 }]))[1].message, /ya no existe/);
    });

    await t.test('validaciones', async () => {
        orden = base();
        assert.equal((await editar([{ id: 'a1', cantidad: 1, tamaño: 'familiar' }], mesera))[0], 403);
        assert.match((await editar([{ id: 'a1', cantidad: 1, tamaño: 'personal' }]))[1].message, /Tamaño inválido/);
        assert.match((await editar([{ id: 'a1', cantidad: 0 }, { id: 'a2', cantidad: 0 }]))[1].message, /anúlela/);
        assert.equal((await editar([{ id: 'zz', cantidad: 1 }]))[0], 409);
        assert.match((await editar([{ id: 'a1', cantidad: 1 }]))[1].message, /No hay cambios/);
        assert.match((await editar([{ id: 'a3', cantidad: 21 }]))[1].message, /Máximo 20/);
        orden.estado = 'Cancelado';
        assert.equal((await editar([{ id: 'a1', cantidad: 2 }]))[0], 409);
    });
});
