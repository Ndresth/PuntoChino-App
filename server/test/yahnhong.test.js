// Pruebas con la configuración de Yahn Hong (node --test corre cada archivo en su propio proceso)
process.env.RESTAURANTE = 'yahnhong';
const test = require('node:test');
const assert = require('node:assert/strict');
const restaurante = require('../lib/restaurante');
const horario = require('../lib/horario');

test('carga la configuración de Yahn Hong', () => {
    assert.equal(restaurante.id, 'yahnhong');
    assert.equal(restaurante.nombreCorto, 'Yahn Hong');
    assert.deepEqual(restaurante.categoriasSoloPos, ['Cajas', 'Combos', 'Salsas']);
});

test('Yahn Hong: todos los días 11:30–20:00 (domingos y festivos incluidos)', () => {
    const e = (iso) => horario.estado(new Date(iso), new Map());
    assert.equal(e('2026-09-23T16:00:00Z').abierto, false); // mié 11:00
    assert.equal(e('2026-09-23T17:00:00Z').abierto, true); // mié 12:00
    assert.equal(e('2026-09-24T00:59:00Z').abierto, true); // mié 19:59
    assert.equal(e('2026-09-24T01:00:00Z').abierto, false); // mié 20:00
    assert.equal(e('2026-09-27T23:00:00Z').abierto, true); // dom 18:00
    assert.equal(e('2026-10-12T21:00:00Z').abierto, true); // festivo 16:00
    assert.equal(e('2026-10-12T21:00:00Z').hoy.festivo, 'Día de la Raza');
});
