const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { entornoPara, decidir, crearPasarela, leerRestaurantes, configurado } = require('../../gateway');

const R = [
    { id: 'puntochino', principal: true, nombreCorto: 'Punto Chino', subtitulo: 'Restaurante Oriental', direccion: 'Calle 45', telefono: '1', whatsapp: '573000000001', marca: {} },
    { id: 'yahnhong', nombreCorto: 'Yahn Hong', subtitulo: 'Restaurante Oriental', direccion: 'Calle 45 B', telefono: '2', whatsapp: '573000000002', marca: {} }
];

test('entorno: cada restaurante recibe solo su base de datos y sus claves', () => {
    const env = {
        PATH: '/bin', NODE_ENV: 'production',
        MONGO_URI: 'mongodb://pc/puntochino', JWT_SECRET: 'pc', ADMIN_PASSWORD: 'pc-admin',
        YAHNHONG_MONGO_URI: 'mongodb://pc/yahnhong', YAHNHONG_JWT_SECRET: 'yh', YAHNHONG_ADMIN_PASSWORD: 'yh-admin'
    };
    const pc = entornoPara(R[0], env, R);
    assert.equal(pc.MONGO_URI, 'mongodb://pc/puntochino');
    assert.equal(pc.ADMIN_PASSWORD, 'pc-admin');
    assert.equal(pc.RESTAURANTE, 'puntochino');
    assert.equal(pc.YAHNHONG_MONGO_URI, undefined);
    assert.equal(pc.PATH, '/bin');

    const yh = entornoPara(R[1], env, R);
    assert.equal(yh.MONGO_URI, 'mongodb://pc/yahnhong');
    assert.equal(yh.JWT_SECRET, 'yh');
    assert.equal(yh.ADMIN_PASSWORD, 'yh-admin');
    assert.equal(yh.RESTAURANTE, 'yahnhong');
    assert.equal(yh.NODE_ENV, 'production');

    // Sin sus variables, Yahn Hong NO usa la base de datos de Punto Chino: queda sin configurar
    const sinYh = entornoPara(R[1], { MONGO_URI: 'mongodb://pc/puntochino', JWT_SECRET: 'pc' }, R);
    assert.equal(sinYh.MONGO_URI, undefined);
    assert.equal(configurado(sinYh), false);
    assert.equal(configurado(pc), true);
});

test('rutas: portada, restaurantes, rutas antiguas y compatibilidad', () => {
    const ids = R.map(r => r.id);
    assert.deepEqual(decidir('/', ids, 'puntochino'), { tipo: 'portada' });
    assert.deepEqual(decidir('/api/health', ids, 'puntochino'), { tipo: 'salud' });
    assert.deepEqual(decidir('/yahnhong', ids, 'puntochino'), { tipo: 'redirigir', a: '/yahnhong/', codigo: 301 });
    assert.deepEqual(decidir('/yahnhong/api/orders', ids, 'puntochino'), { tipo: 'proxy', id: 'yahnhong', ruta: '/api/orders', conPrefijo: true });
    assert.deepEqual(decidir('/puntochino/', ids, 'puntochino'), { tipo: 'proxy', id: 'puntochino', ruta: '/', conPrefijo: true });
    assert.deepEqual(decidir('/pos', ids, 'puntochino'), { tipo: 'redirigir', a: '/puntochino/pos', codigo: 302 });
    assert.deepEqual(decidir('/api/orders', ids, 'puntochino'), { tipo: 'proxy', id: 'puntochino', ruta: '/api/orders' });
    assert.deepEqual(decidir('/cualquier-cosa', ids, 'puntochino'), { tipo: 'redirigir', a: '/', codigo: 302 });
    assert.equal(decidir('/yahnhongx/pos', ids, 'puntochino').tipo, 'redirigir'); // no confunde prefijos parecidos
});

test('los restaurantes del repositorio tienen configuración válida para la pasarela', () => {
    const lista = leerRestaurantes();
    assert.deepEqual(lista.map(r => r.id), ['puntochino', 'yahnhong']);
    assert.equal(lista.filter(r => r.principal).length, 1);
});

/** Copia falsa del servidor de un restaurante: responde quién es y qué ruta recibió. */
const servidorFalso = (nombre) => http.createServer((req, res) => {
    if (req.url === '/api/stream') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.write('event: hola\ndata: {}\n\n'); // queda abierto, como el stream real
        return;
    }
    if (req.url === '/redirige') { res.writeHead(302, { Location: '/login' }); return res.end(); }
    if (req.url === '/api/health') { res.writeHead(200); return res.end('{}'); }
    let cuerpo = '';
    req.on('data', c => { cuerpo += c; });
    req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ nombre, ruta: req.url, metodo: req.method, cuerpo }));
    });
});

const escuchar = (srv) => new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv.address().port)));

test('pasarela: reparte por ruta a la copia de cada restaurante', async (t) => {
    const pc = servidorFalso('puntochino');
    const yh = servidorFalso('yahnhong');
    const puertos = { puntochino: await escuchar(pc), yahnhong: await escuchar(yh) };
    const estados = { puntochino: 'en marcha', yahnhong: 'en marcha' };
    const pasarela = crearPasarela({ restaurantes: R, principal: 'puntochino', puertoDe: id => puertos[id], estadoDe: id => estados[id] });
    const base = `http://127.0.0.1:${await escuchar(pasarela)}`;
    t.after(() => { pasarela.close(); pc.close(); yh.close(); pasarela.closeAllConnections(); pc.closeAllConnections(); yh.closeAllConnections(); });
    const pedir = (ruta, op = {}) => fetch(base + ruta, { redirect: 'manual', ...op });

    let r = await (await pedir('/yahnhong/api/productos?x=1')).json();
    assert.deepEqual([r.nombre, r.ruta], ['yahnhong', '/api/productos?x=1']);
    r = await (await pedir('/puntochino/api/orders', { method: 'POST', body: '{"a":1}', headers: { 'Content-Type': 'application/json' } })).json();
    assert.deepEqual([r.nombre, r.ruta, r.metodo, r.cuerpo], ['puntochino', '/api/orders', 'POST', '{"a":1}']);

    // Pestañas viejas (sin prefijo) siguen yendo a Punto Chino
    r = await (await pedir('/api/orders')).json();
    assert.equal(r.nombre, 'puntochino');

    // Las redirecciones del servidor quedan dentro de la ruta del restaurante
    assert.equal((await pedir('/yahnhong/redirige')).headers.get('location'), '/yahnhong/login');
    assert.equal((await pedir('/cocina')).headers.get('location'), '/puntochino/cocina');

    // El stream en vivo llega sin esperar a que termine la respuesta
    const ctrl = new AbortController();
    const s = await pedir('/yahnhong/api/stream', { signal: ctrl.signal });
    const { value } = await s.body.getReader().read();
    assert.match(new TextDecoder().decode(value), /event: hola/);
    ctrl.abort();

    // Portada con los dos restaurantes
    const html = await (await pedir('/')).text();
    assert.match(html, /Punto Chino/);
    assert.match(html, /Yahn Hong/);
    assert.match(html, /href="\/yahnhong\/"/);
    assert.doesNotMatch(html, /login/); // el personal entra por /<id>/login, sin enlace visible para clientes

    // Salud: ok mientras ambos respondan
    let salud = await pedir('/api/health');
    assert.equal(salud.status, 200);
    assert.deepEqual((await salud.json()).restaurantes, { puntochino: 'ok', yahnhong: 'ok' });

    // Si uno se cae: 503 en su ruta (el otro sigue) y la salud lo reporta
    yh.closeAllConnections();
    await new Promise(res => yh.close(res));
    const caido = await pedir('/yahnhong/', { headers: { Accept: 'text/html' } });
    assert.equal(caido.status, 503);
    assert.match(await caido.text(), /se está iniciando/);
    assert.equal((await (await pedir('/puntochino/api/x')).json()).nombre, 'puntochino');
    salud = await pedir('/api/health');
    assert.equal(salud.status, 503);
    assert.equal((await salud.json()).restaurantes.yahnhong, 'caído');

    // Restaurante sin variables: "Próximamente" en la portada y su ruta vuelve a la portada
    estados.yahnhong = 'sin configurar';
    assert.match(await (await pedir('/')).text(), /Próximamente/);
    assert.equal((await pedir('/yahnhong/')).headers.get('location'), '/');
    salud = await pedir('/api/health');
    assert.equal(salud.status, 200);
});
