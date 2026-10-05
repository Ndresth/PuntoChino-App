const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDesechables } = require('../lib/desechables');
const { HttpError } = require('../lib/util');
const config = require('../lib/restaurante');

test('desechables: precios y límites vienen de la configuración del restaurante', () => {
    const items = buildDesechables({ cucharas: 2, platos: 3 }, HttpError);
    const platos = config.desechables.find(d => d.key === 'platos');
    assert.equal(items.length, 2);
    assert.equal(items.find(i => i.nombre === platos.item).precio, platos.precio);
    assert.ok(items.every(i => i.extra));
});

test('desechables: límites y vasos solo con bebida', () => {
    assert.throws(() => buildDesechables({ cucharas: 21 }, HttpError), /Máximo 20/);
    assert.equal(buildDesechables({ cucharas: 20, platos: 20 }, HttpError).length, 2);
    assert.throws(() => buildDesechables({ platos: 21 }, HttpError), /Máximo 20/);
    assert.throws(() => buildDesechables({ platos: -1 }, HttpError), /Máximo/);
    assert.throws(() => buildDesechables({ vasos: 1 }, HttpError), /bebida/);
    assert.equal(buildDesechables({ vasos: 2 }, HttpError, { tieneBebida: true }).length, 1);
    assert.deepEqual(buildDesechables(undefined, HttpError), []);
});
