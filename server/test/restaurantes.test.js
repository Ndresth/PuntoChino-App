const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '../../restaurantes');
const ids = fs.readdirSync(RAIZ).filter(d => fs.existsSync(path.join(RAIZ, d, 'config.json')));
const IMAGENES_COMUNES = path.join(__dirname, '../../client/public');

test('hay al menos dos restaurantes y uno es el principal', () => {
    assert.ok(ids.length >= 2);
    assert.equal(ids.filter(id => require(path.join(RAIZ, id, 'config.json')).principal).length, 1);
});

for (const id of ids) {
    test(`configuración y menú de ${id}`, () => {
        const c = require(path.join(RAIZ, id, 'config.json'));
        assert.equal(c.id, id);
        for (const campo of ['nombre', 'nombreCorto', 'archivo', 'nit', 'direccion', 'telefono', 'whatsapp', 'categorias', 'categoriaBebidas', 'categoriasSoloPos', 'desechables', 'horario', 'marca']) {
            assert.ok(c[campo] !== undefined, `${id}: falta "${campo}"`);
        }
        assert.match(c.whatsapp, /^57\d{10}$/);
        assert.ok(fs.existsSync(path.join(RAIZ, id, 'public/images/logo.png')), `${id}: falta el logo`);

        const menu = require(path.join(RAIZ, id, 'menu.json'));
        assert.equal(new Set(menu.map(p => p.id)).size, menu.length, `${id}: ids repetidos en el menú`);
        for (const p of menu) {
            assert.ok(c.categorias.includes(p.categoria), `${id}: "${p.nombre}" tiene una categoría que no existe (${p.categoria})`);
            if (p.imagen?.startsWith('/')) {
                const existe = [path.join(RAIZ, id, 'public'), IMAGENES_COMUNES].some(d => fs.existsSync(path.join(d, p.imagen)));
                assert.ok(existe, `${id}: no existe la imagen ${p.imagen}`);
            }
        }
    });
}
