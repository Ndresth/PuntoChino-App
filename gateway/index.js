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
    if (pathname === '/icono.svg' || pathname === '/icono-180.png') return { tipo: 'icono', archivo: pathname.slice(1) };
    if (/^\/fuentes\/poppins-(400|600|800)\.woff2$/.test(pathname)) return { tipo: 'fuente', peso: pathname.match(/(\d{3})/)[1] };
    if (pathname === '/favicon.ico') return { tipo: 'icono', archivo: 'icono-180.png' };
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

const h12 = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};
/** "Todos los días 11:30 a. m. – 8:00 p. m." o "Lun a sáb ... · Dom y festivos ..." */
const textoHorario = ({ normal, domingoFestivo } = {}) => {
    if (!normal || !domingoFestivo) return '';
    if (normal.abre === domingoFestivo.abre && normal.cierra === domingoFestivo.cierra) return `Todos los días ${h12(normal.abre)} – ${h12(normal.cierra)}`;
    return `Lun a sáb ${h12(normal.abre)} – ${h12(normal.cierra)} · Dom y festivos ${h12(domingoFestivo.abre)} – ${h12(domingoFestivo.cierra)}`;
};

const ICONO = {
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>',
    tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1Z"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 10.4 3.2 1.9-.8 1.3L11 13V7h2Z"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 5.3 19.9 12l-6.7 6.7-1.4-1.4 4.3-4.3H4v-2h12.1l-4.3-4.3Z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>'
};

/** Portada pública: una tarjeta por restaurante (Abierto/Cerrado lo completa portada.js). El personal entra por /<id>/login. */
function htmlPortada(restaurantes, estadoDe) {
    const tarjetas = restaurantes.map(r => {
        const listo = estadoDe(r.id) !== 'sin configurar';
        const m = r.marca || {};
        const color = esc(m.colorTema || '#c62828');
        const texto = esc(m.colorTextoBarra || '#ffffff');
        const tel = String(r.telefono || '').replace(/\D/g, '');
        return `
    <article class="tarjeta" data-restaurante="${esc(r.id)}" style="--marca:${color};--marca-texto:${texto}">
      <header>
        <img src="/${esc(r.id)}/images/logo.png" alt="Logo de ${esc(r.nombreCorto)}" width="84" height="84">
        <div>
          <h2>${esc(r.nombreCorto)}</h2>
          <p>${esc(r.subtitulo)}</p>
        </div>
      </header>
      <div class="cuerpo">
        <span class="estado">${listo ? 'Consultando horario…' : 'Próximamente'}</span>
        <ul class="datos">
          <li>${ICONO.reloj}<span>${esc(textoHorario(r.horario))}</span></li>
          <li>${ICONO.pin}<span>${esc(r.direccion)}</span></li>
          <li>${ICONO.tel}<a href="tel:+57${esc(tel)}">${esc(r.telefono)}</a></li>
        </ul>
        ${listo
        ? `<a class="boton" href="/${esc(r.id)}/">Ver menú y pedir ${ICONO.flecha}</a>
        <a class="whatsapp" href="https://wa.me/${esc(r.whatsapp)}" rel="noopener">${ICONO.whatsapp} Escribir por WhatsApp</a>`
        : '<span class="boton apagado">Muy pronto</span>'}
      </div>
    </article>`;
    }).join('');
    const nombres = restaurantes.map(r => esc(r.nombreCorto)).join(' · ');
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#18181b">
<title>${nombres} · Menú y pedidos</title>
<meta name="description" content="${nombres}: menú, pedidos a domicilio y para recoger.">
<link rel="icon" type="image/svg+xml" href="/icono.svg">
<link rel="apple-touch-icon" href="/icono-180.png">
<style>
  @font-face { font-family: Poppins; font-weight: 400; font-display: swap; src: url(/fuentes/poppins-400.woff2) format('woff2'); }
  @font-face { font-family: Poppins; font-weight: 600; font-display: swap; src: url(/fuentes/poppins-600.woff2) format('woff2'); }
  @font-face { font-family: Poppins; font-weight: 800; font-display: swap; src: url(/fuentes/poppins-800.woff2) format('woff2'); }
  :root {
    --fondo: #f6f3ef; --tarjeta: #ffffff; --texto: #1f2933; --suave: #6b7280; --linea: #ebe5de;
    --sombra: 0 1px 2px rgba(0,0,0,.04), 0 12px 32px rgba(60,30,10,.08);
    color-scheme: light dark;
  }
  @media (prefers-color-scheme: dark) {
    :root { --fondo: #111315; --tarjeta: #1d2024; --texto: #eceef0; --suave: #a0a6ad; --linea: #2c3036; --sombra: 0 12px 32px rgba(0,0,0,.45); }
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0; min-height: 100vh; font-family: Poppins, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    background: var(--fondo); color: var(--texto); -webkit-font-smoothing: antialiased;
  }
  .cabecera {
    background: linear-gradient(160deg, #1f1f23 0%, #2b1414 55%, #3a1010 100%); color: #fff; text-align: center;
    padding: calc(40px + env(safe-area-inset-top)) 20px 92px;
  }
  .cabecera .marca { display: inline-flex; gap: 8px; align-items: center; font-size: .78rem; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: #fcd34d; margin-bottom: 12px; }
  .cabecera h1 { margin: 0 auto; max-width: 640px; font-size: clamp(1.7rem, 6vw, 2.6rem); font-weight: 800; line-height: 1.15; }
  .cabecera p { margin: 12px auto 0; max-width: 520px; color: rgba(255,255,255,.75); font-size: 1rem; }
  main { max-width: 960px; margin: -64px auto 0; padding: 0 16px 40px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 22px; }
  .tarjeta {
    background: var(--tarjeta); border-radius: 22px; overflow: hidden; display: flex; flex-direction: column;
    box-shadow: var(--sombra); border: 1px solid var(--linea); transition: transform .2s ease, box-shadow .2s ease;
  }
  @media (hover: hover) { .tarjeta:hover { transform: translateY(-3px); box-shadow: 0 18px 40px rgba(60,30,10,.14); } }
  .tarjeta header {
    position: relative; display: flex; align-items: center; gap: 16px; padding: 22px 22px 20px;
    background: var(--marca); color: var(--marca-texto);
    background-image: radial-gradient(circle at 100% 0%, rgba(255,255,255,.22), transparent 55%);
  }
  .tarjeta header img {
    width: 84px; height: 84px; flex-shrink: 0; border-radius: 50%; background: #fff; padding: 5px; object-fit: contain;
    box-shadow: 0 6px 16px rgba(0,0,0,.18), 0 0 0 4px rgba(255,255,255,.35);
  }
  .tarjeta h2 { margin: 0; font-size: 1.45rem; font-weight: 800; letter-spacing: .02em; text-transform: uppercase; line-height: 1.1; }
  .tarjeta header p { margin: 4px 0 0; font-size: .92rem; opacity: .85; }
  .cuerpo { display: flex; flex-direction: column; gap: 14px; padding: 20px 22px 22px; flex: 1; }
  .estado {
    align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; font-size: .86rem; font-weight: 600;
    padding: 6px 14px 6px 12px; border-radius: 999px; background: var(--fondo); color: var(--suave);
  }
  .estado::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; opacity: .8; }
  .estado.abierto { background: #dcfce7; color: #166534; }
  .estado.abierto::before { box-shadow: 0 0 0 3px rgba(22,101,52,.18); }
  .estado.cerrado { background: #fee2e2; color: #991b1b; }
  @media (prefers-color-scheme: dark) {
    .estado.abierto { background: rgba(34,197,94,.14); color: #86efac; }
    .estado.cerrado { background: rgba(239,68,68,.14); color: #fca5a5; }
  }
  .datos { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .datos li { display: flex; align-items: flex-start; gap: 10px; color: var(--suave); font-size: .93rem; line-height: 1.35; }
  .datos svg { width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; fill: currentColor; opacity: .75; }
  .datos a { color: inherit; text-decoration: none; border-bottom: 1px dashed currentColor; }
  .boton {
    margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 15px 18px;
    border-radius: 14px; background: var(--marca); color: var(--marca-texto); font-weight: 700; font-size: 1.02rem;
    text-decoration: none; box-shadow: 0 6px 16px rgba(0,0,0,.12); transition: filter .15s ease, transform .1s ease;
  }
  .boton svg { width: 20px; height: 20px; fill: currentColor; }
  .boton:hover { filter: brightness(.95); }
  .boton:active { transform: scale(.98); }
  .boton.apagado { background: var(--linea); color: var(--suave); box-shadow: none; }
  .whatsapp {
    display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px; border-radius: 14px;
    color: #15803d; font-weight: 600; font-size: .95rem; text-decoration: none; border: 1.5px solid rgba(21,128,61,.28);
  }
  .whatsapp svg { width: 20px; height: 20px; fill: currentColor; }
  .whatsapp:hover { background: rgba(21,128,61,.07); }
  @media (prefers-color-scheme: dark) { .whatsapp { color: #4ade80; border-color: rgba(74,222,128,.3); } }
  .pie { text-align: center; color: var(--suave); font-size: .85rem; margin: 28px 0 0; padding-bottom: env(safe-area-inset-bottom); }
  :focus-visible { outline: 3px solid #f59e0b; outline-offset: 2px; }
  @media (max-width: 380px) { .tarjeta header { padding: 18px; gap: 12px; } .tarjeta header img { width: 68px; height: 68px; } .tarjeta h2 { font-size: 1.2rem; } }
</style>
</head>
<body>
<div class="cabecera">
  <div class="marca">🥢 Comida oriental</div>
  <h1>¿Dónde quieres pedir hoy?</h1>
  <p>Elige el restaurante, mira su menú y haz tu pedido a domicilio o para recoger.</p>
</div>
<main>
  <section class="grid">${tarjetas}
  </section>
  <p class="pie">Pago en efectivo o Nequi · Pedidos por WhatsApp</p>
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
        if (d.tipo === 'icono') {
            return fs.readFile(path.join(__dirname, 'publico', d.archivo), (err, datos) => {
                if (err) { res.writeHead(404); return res.end(); }
                res.writeHead(200, { 'Content-Type': d.archivo.endsWith('.svg') ? 'image/svg+xml' : 'image/png', 'Cache-Control': 'public, max-age=604800' });
                res.end(datos);
            });
        }
        if (d.tipo === 'fuente') {
            const archivo = path.join(RAIZ, 'client/node_modules/@fontsource/poppins/files', `poppins-latin-${d.peso}-normal.woff2`);
            return fs.readFile(archivo, (err, datos) => {
                if (err) { res.writeHead(404); return res.end(); }
                res.writeHead(200, { 'Content-Type': 'font/woff2', 'Cache-Control': 'public, max-age=31536000, immutable' });
                res.end(datos);
            });
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
