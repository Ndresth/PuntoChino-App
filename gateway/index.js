/**
 * Pasarela: un solo servicio web (Render) para varios restaurantes.
 *
 * - Arranca una copia del servidor (server/index.js) por cada restaurante de restaurantes/<id>,
 *   cada una con SU base de datos, claves y JWT (variables con prefijo, p. ej. YAHNHONG_MONGO_URI).
 * - Recibe todo el tráfico en PORT y lo reparte por ruta: /puntochino/... y /yahnhong/...
 *   (quita el prefijo antes de pasarlo, así cada servidor funciona igual que si estuviera solo).
 * - En "/" muestra la portada con los restaurantes; /api/health resume la salud de todos.
 * - Si una copia se cae, la vuelve a arrancar; las demás siguen atendiendo.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const CARPETA_RESTAURANTES = path.join(RAIZ, 'restaurantes');

// Variables que identifican la base de datos y las claves de un restaurante.
// Un restaurante que no es el principal NUNCA hereda las del principal (evita mezclar datos).
const PROPIAS = ['MONGO_URI', 'JWT_SECRET', 'ADMIN_PASSWORD', 'CAJERO_PASSWORD', 'MESERA_PASSWORD', 'COCINA_PASSWORD', 'CORS_ORIGIN'];
// Rutas del sitio anterior (Punto Chino vivía en la raíz)
const RUTAS_ANTIGUAS = ['/pos', '/cocina', '/admin', '/login'];
const COMPATIBLES = ['/api/', '/images/', '/assets/'];

const prefijoDe = (id) => `${id.toUpperCase().replace(/-/g, '_')}_`;

/** Restaurantes configurados (restaurantes/<id>/config.json), en el orden de la portada. */
function leerRestaurantes(carpeta = CARPETA_RESTAURANTES) {
    return fs.readdirSync(carpeta)
        .filter(id => /^[a-z0-9-]+$/.test(id) && fs.existsSync(path.join(carpeta, id, 'config.json')))
        .map(id => ({ ...JSON.parse(fs.readFileSync(path.join(carpeta, id, 'config.json'), 'utf8')), id }))
        .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
}

/**
 * Entorno de la copia del servidor de un restaurante:
 * - YAHNHONG_MONGO_URI -> MONGO_URI (solo para Yahn Hong), etc.
 * - El principal también acepta las variables sin prefijo (las que ya tenía el servicio).
 * - Nunca recibe las variables con prefijo de otro restaurante.
 */
function entornoPara(r, env, todos) {
    const propio = prefijoDe(r.id);
    const ajenos = todos.filter(x => x.id !== r.id).map(x => prefijoDe(x.id));
    const salida = {};
    for (const [k, v] of Object.entries(env)) {
        if (k.startsWith(propio) || ajenos.some(p => k.startsWith(p))) continue;
        if (PROPIAS.includes(k) && !r.principal) continue;
        salida[k] = v;
    }
    for (const [k, v] of Object.entries(env)) {
        if (k.startsWith(propio) && k.length > propio.length) salida[k.slice(propio.length)] = v;
    }
    salida.RESTAURANTE = r.id;
    salida.PASARELA = '1';
    return salida;
}

const configurado = (entorno) => Boolean(entorno.MONGO_URI && entorno.JWT_SECRET);

/** Qué hacer con una ruta: portada, salud, pasar a un restaurante o redirigir. */
function decidir(pathname, ids, principal) {
    if (pathname === '/') return { tipo: 'portada' };
    if (pathname === '/api/health') return { tipo: 'salud' };
    if (pathname === '/portada.js') return { tipo: 'script' };
    if (pathname === '/favicon.ico') return { tipo: 'proxy', id: principal, ruta: '/images/logo.png' };
    const [, primero] = pathname.split('/');
    if (ids.includes(primero)) {
        if (pathname === `/${primero}`) return { tipo: 'redirigir', a: `/${primero}/`, codigo: 301 };
        return { tipo: 'proxy', id: primero, ruta: pathname.slice(primero.length + 1), conPrefijo: true };
    }
    if (RUTAS_ANTIGUAS.some(r => pathname === r || pathname.startsWith(`${r}/`))) {
        return { tipo: 'redirigir', a: `/${principal}${pathname}`, codigo: 302 };
    }
    // Pestañas abiertas antes del cambio siguen funcionando hasta recargar
    if (COMPATIBLES.some(r => pathname.startsWith(r))) return { tipo: 'proxy', id: principal, ruta: pathname };
    return { tipo: 'redirigir', a: '/', codigo: 302 };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CABECERAS_PROPIAS = {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY'
};

/** Portada: tarjeta por restaurante con su estado (Abierto/Cerrado lo completa portada.js). */
function htmlPortada(restaurantes, estadoDe) {
    const tarjetas = restaurantes.map(r => {
        const listo = estadoDe(r.id) !== 'sin configurar';
        const m = r.marca || {};
        return `
      <article class="tarjeta" data-restaurante="${esc(r.id)}">
        <header style="background:${esc(m.colorTema || '#c62828')};color:${esc(m.colorTextoBarra || '#fff')}">
          <img src="/${esc(r.id)}/images/logo.png" alt="" width="72" height="72">
          <div><h2>${esc(r.nombreCorto)}</h2><p>${esc(r.subtitulo)}</p></div>
        </header>
        <div class="cuerpo">
          <span class="estado">${listo ? '…' : 'Próximamente'}</span>
          <p class="dato">📍 ${esc(r.direccion)}</p>
          <p class="dato">📞 ${esc(r.telefono)}</p>
          ${listo
        ? `<a class="boton" href="/${esc(r.id)}/">Ver menú y pedir</a>
          <a class="secundario" href="https://wa.me/${esc(r.whatsapp)}" rel="noopener">Escribir por WhatsApp</a>`
        : '<span class="boton apagado">Muy pronto</span>'}
        </div>
        <footer>${listo ? `<a href="/${esc(r.id)}/login">Ingreso del personal</a>` : ''}</footer>
      </article>`;
    }).join('');
    const nombres = restaurantes.map(r => esc(r.nombreCorto)).join(' · ');
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${nombres}</title>
<meta name="description" content="${nombres}: menú y pedidos a domicilio.">
<link rel="icon" href="/${esc(restaurantes[0]?.id)}/images/logo.png">
<style>
  :root { --fondo:#f4f4f5; --tarjeta:#fff; --texto:#1f2933; --suave:#6b7280; --linea:#e5e7eb; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --fondo:#121416; --tarjeta:#212529; --texto:#e9ecef; --suave:#9aa0a6; --linea:#343a40; } }
  * { box-sizing: border-box; }
  body { margin:0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; background:var(--fondo); color:var(--texto); }
  main { max-width: 920px; margin: 0 auto; padding: 32px 16px 48px; }
  h1 { text-align:center; font-size: clamp(1.4rem, 4vw, 2rem); margin: 0 0 6px; }
  .intro { text-align:center; color:var(--suave); margin: 0 0 28px; }
  .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 20px; }
  .tarjeta { background:var(--tarjeta); border:1px solid var(--linea); border-radius:18px; overflow:hidden; display:flex; flex-direction:column; box-shadow: 0 6px 18px rgba(0,0,0,.06); }
  .tarjeta header { display:flex; align-items:center; gap:14px; padding:18px; }
  .tarjeta header img { width:72px; height:72px; border-radius:50%; background:#fff; padding:4px; object-fit:contain; flex-shrink:0; }
  .tarjeta h2 { margin:0; font-size:1.35rem; font-weight:800; text-transform:uppercase; letter-spacing:.02em; }
  .tarjeta header p { margin:2px 0 0; opacity:.85; font-size:.9rem; }
  .cuerpo { padding:16px 18px 6px; display:flex; flex-direction:column; gap:8px; flex:1; }
  .estado { align-self:flex-start; font-size:.85rem; font-weight:700; padding:4px 12px; border-radius:999px; background:var(--fondo); color:var(--suave); }
  .estado.abierto { background:#dcfce7; color:#166534; }
  .estado.cerrado { background:#fee2e2; color:#991b1b; }
  @media (prefers-color-scheme: dark) { .estado.abierto { background:rgba(34,197,94,.15); color:#86efac; } .estado.cerrado { background:rgba(239,68,68,.15); color:#fca5a5; } }
  .dato { margin:0; color:var(--suave); font-size:.92rem; }
  .boton { display:block; text-align:center; margin-top:8px; padding:13px; border-radius:12px; background:#c62828; color:#fff; font-weight:700; text-decoration:none; }
  .boton:hover { background:#9f1d1d; }
  .boton.apagado { background:var(--linea); color:var(--suave); }
  .secundario { text-align:center; color:#15803d; font-weight:600; text-decoration:none; font-size:.92rem; padding:6px; }
  .tarjeta footer { padding: 4px 18px 14px; text-align:center; }
  .tarjeta footer a { color:var(--suave); font-size:.8rem; }
</style>
</head>
<body>
<main>
  <h1>¿Dónde quieres pedir hoy?</h1>
  <p class="intro">Elige el restaurante para ver su menú y hacer tu pedido.</p>
  <section class="grid">${tarjetas}
  </section>
</main>
<script src="/portada.js" defer></script>
</body>
</html>`;
}

// Completa "Abierto · hasta 6:30 p. m." / "Cerrado · abre mañana 11:30 a. m." con el horario de cada restaurante
const SCRIPT_PORTADA = `(() => {
  const TZ = 'America/Bogota';
  const hora = (d) => new Date(d).toLocaleTimeString('es-CO', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  const dia = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
  document.querySelectorAll('[data-restaurante]').forEach(async (t) => {
    const e = t.querySelector('.estado');
    if (!e || e.textContent === 'Próximamente') return;
    try {
      const r = await fetch('/' + t.dataset.restaurante + '/api/horario');
      if (!r.ok) throw new Error();
      const h = await r.json();
      if (h.abierto) { e.textContent = 'Abierto · hasta ' + hora(h.hoy.cierra); e.classList.add('abierto'); return; }
      const hoy = dia(h.ahora), cuando = dia(h.proxima.abre);
      const manana = dia(new Date(new Date(h.ahora).getTime() + 86400000));
      const etiqueta = cuando === hoy ? 'hoy' : cuando === manana ? 'mañana' : new Date(h.proxima.abre).toLocaleDateString('es-CO', { timeZone: TZ, weekday: 'long' });
      e.textContent = 'Cerrado · abre ' + etiqueta + ' ' + hora(h.proxima.abre);
      e.classList.add('cerrado');
    } catch { e.textContent = ''; e.style.display = 'none'; }
  });
})();
`;

const paginaIniciando = (nombre) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="4"><title>${esc(nombre)}</title></head>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;text-align:center;color:#444"><div><h2>${esc(nombre)} se está iniciando…</h2><p>La página se recarga sola en unos segundos.</p></div></body></html>`;

/** Pasa la petición a la copia del servidor del restaurante, sin el prefijo de la ruta. */
function pasar(req, res, { puerto, ruta, prefijo, nombre }) {
    const salida = http.request({ host: '127.0.0.1', port: puerto, method: req.method, path: ruta, headers: req.headers }, (r) => {
        const cabeceras = { ...r.headers };
        // Redirecciones del servidor ("/login") deben quedar dentro de la ruta del restaurante
        if (prefijo && typeof cabeceras.location === 'string' && cabeceras.location.startsWith('/') && !cabeceras.location.startsWith('//')) {
            cabeceras.location = prefijo + cabeceras.location;
        }
        res.writeHead(r.statusCode, cabeceras);
        r.pipe(res);
    });
    salida.on('error', () => {
        if (res.headersSent) return res.destroy();
        const html = (req.headers.accept || '').includes('text/html');
        res.writeHead(503, { 'Content-Type': html ? 'text/html; charset=utf-8' : 'application/json', 'Retry-After': '5', 'Cache-Control': 'no-store' });
        res.end(html ? paginaIniciando(nombre) : JSON.stringify({ message: `${nombre} se está iniciando. Intente de nuevo en unos segundos.` }));
    });
    req.pipe(salida);
    // Si el navegador se va (p. ej. cierra la pantalla de cocina), se corta también el stream en vivo
    res.on('close', () => salida.destroy());
}

/** 'ok' | 'sin base de datos' (el servidor responde pero no llega a MongoDB) | 'caído' */
const saludDe = (puerto) => new Promise((resolve) => {
    const r = http.get({ host: '127.0.0.1', port: puerto, path: '/api/health', timeout: 3000 }, (res) => {
        res.resume();
        resolve(res.statusCode === 200 ? 'ok' : 'sin base de datos');
    });
    r.on('timeout', () => r.destroy());
    r.on('error', () => resolve('caído'));
});

/**
 * Servidor de la pasarela.
 * @param {{ restaurantes: object[], principal: string, puertoDe: (id) => number, estadoDe: (id) => string }} op
 */
function crearPasarela({ restaurantes, principal, puertoDe, estadoDe }) {
    const ids = restaurantes.map(r => r.id);
    const porId = new Map(restaurantes.map(r => [r.id, r]));

    return http.createServer(async (req, res) => {
        let url;
        try { url = new URL(req.url, 'http://pasarela'); } catch { res.writeHead(400); return res.end(); }
        const d = decidir(url.pathname, ids, principal);

        if (d.tipo === 'portada') {
            res.writeHead(200, { ...CABECERAS_PROPIAS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
            return res.end(htmlPortada(restaurantes, estadoDe));
        }
        if (d.tipo === 'script') {
            res.writeHead(200, { ...CABECERAS_PROPIAS, 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
            return res.end(SCRIPT_PORTADA);
        }
        if (d.tipo === 'salud') {
            const detalle = {};
            await Promise.all(restaurantes.map(async (r) => {
                const estado = estadoDe(r.id);
                detalle[r.id] = estado === 'sin configurar' ? estado : await saludDe(puertoDe(r.id));
            }));
            const ok = Object.values(detalle).every(v => v === 'ok' || v === 'sin configurar');
            res.writeHead(ok ? 200 : 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
            return res.end(JSON.stringify({ ok, restaurantes: detalle }));
        }
        if (d.tipo === 'redirigir') {
            res.writeHead(d.codigo, { Location: d.a + url.search, 'Cache-Control': 'no-cache' });
            return res.end();
        }
        const r = porId.get(d.id);
        if (estadoDe(r.id) === 'sin configurar') {
            res.writeHead(302, { Location: '/', 'Cache-Control': 'no-cache' });
            return res.end();
        }
        pasar(req, res, { puerto: puertoDe(r.id), ruta: (d.ruta || '/') + url.search, prefijo: d.conPrefijo ? `/${r.id}` : '', nombre: r.nombreCorto });
    });
}

/** Arranca las copias del servidor y la pasarela (lo que ejecuta Render con `npm start`). */
function iniciar() {
    // En desarrollo local las variables pueden estar en server/.env (en Render vienen del panel)
    try {
        require(path.join(RAIZ, 'server/node_modules/dotenv')).config({ path: path.join(RAIZ, 'server/.env'), quiet: true });
    } catch { /* sin dotenv o sin .env */ }
    const restaurantes = leerRestaurantes();
    if (!restaurantes.length) throw new Error('No hay restaurantes en restaurantes/<id>/config.json');
    const principal = (restaurantes.find(r => r.principal) || restaurantes[0]).id;
    const base = Number(process.env.PUERTO_INTERNO || 10100);
    const puertos = new Map(restaurantes.map((r, i) => [r.id, base + i]));
    const estados = new Map();
    const procesos = new Map();
    let cerrando = false;

    const log = (id, texto) => {
        for (const linea of String(texto).split('\n')) if (linea.trim()) console.log(`[${id}] ${linea}`);
    };

    const arrancar = (r, intento = 0) => {
        const entorno = entornoPara(r, process.env, restaurantes);
        if (!configurado(entorno)) {
            estados.set(r.id, 'sin configurar');
            console.warn(`[pasarela] ${r.nombreCorto}: faltan ${prefijoDe(r.id)}MONGO_URI y/o ${prefijoDe(r.id)}JWT_SECRET; se muestra como "Próximamente".`);
            return;
        }
        entorno.PORT = String(puertos.get(r.id));
        // Memoria repartida: el plan gratis de Render tiene 512 MB para todo el servicio
        entorno.NODE_OPTIONS = `${entorno.NODE_OPTIONS || ''} --max-old-space-size=${process.env.MEMORIA_POR_RESTAURANTE || 180}`.trim();
        estados.set(r.id, 'iniciando');
        const inicio = Date.now();
        const hijo = spawn(process.execPath, [path.join(RAIZ, 'server/index.js')], { cwd: path.join(RAIZ, 'server'), env: entorno, stdio: ['ignore', 'pipe', 'pipe'] });
        procesos.set(r.id, hijo);
        hijo.stdout.on('data', (b) => log(r.id, b));
        hijo.stderr.on('data', (b) => log(r.id, b));
        hijo.on('spawn', () => estados.set(r.id, 'en marcha'));
        hijo.on('exit', (codigo, senal) => {
            procesos.delete(r.id);
            estados.set(r.id, 'reiniciando');
            if (cerrando) return;
            const siguiente = Date.now() - inicio > 60000 ? 0 : intento + 1;
            const espera = Math.min(30000, 1000 * 2 ** siguiente);
            console.error(`[pasarela] ${r.nombreCorto} se detuvo (${senal || codigo}); se reinicia en ${espera / 1000} s`);
            setTimeout(() => arrancar(r, siguiente), espera);
        });
    };

    restaurantes.forEach(r => arrancar(r));

    const servidor = crearPasarela({ restaurantes, principal, puertoDe: id => puertos.get(id), estadoDe: id => estados.get(id) });
    const PORT = Number(process.env.PORT || 3000);
    servidor.listen(PORT, () => console.log(`[pasarela] En el puerto ${PORT}: ${restaurantes.map(r => `/${r.id}`).join(', ')}`));

    const cerrar = () => {
        if (cerrando) return;
        cerrando = true;
        for (const hijo of procesos.values()) hijo.kill('SIGTERM');
        servidor.close();
        setTimeout(() => process.exit(0), 5000).unref();
    };
    process.on('SIGTERM', cerrar);
    process.on('SIGINT', cerrar);
}

module.exports = { leerRestaurantes, entornoPara, decidir, crearPasarela, htmlPortada, configurado };

if (require.main === module) iniciar();
