import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import purgecss from '@fullhuman/postcss-purgecss'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const ruta = (r) => fileURLToPath(new URL(r, import.meta.url))

// Restaurante de este build (restaurantes/<id>). `npm run build` compila todos (scripts/build.mjs);
// en desarrollo: RESTAURANTE=yahnhong npm run dev (por defecto Punto Chino).
const RESTAURANTE = process.env.RESTAURANTE || 'puntochino'
if (!/^[a-z0-9-]+$/.test(RESTAURANTE)) throw new Error(`RESTAURANTE inválido: "${RESTAURANTE}"`)
const carpeta = ruta(`../restaurantes/${RESTAURANTE}/`)
const config = JSON.parse(fs.readFileSync(path.join(carpeta, 'config.json'), 'utf8'))
const BASE = `/${RESTAURANTE}/`

// En el build se eliminan del CSS (Bootstrap + Bootstrap Icons + estilos propios) las clases que
// el código no usa: el CSS pasa de ~330 KB a una fracción y la web carga más rápido en celular.
// Las clases se buscan como texto en el código, así que deben escribirse completas
// (ej. 'btn-success', nunca 'btn-' + color).
export const PURGE = {
  content: [ruta('./index.html'), ruta('./src/**/*.{js,jsx}'), ruta('../restaurantes/**/*.json')],
  // Clases que ponen las librerías (gráficas, alertas, avisos) y etiquetas que no aparecen en JSX
  safelist: {
    standard: [
      'html', 'body', 'svg', 'show', 'fade', 'active', 'disabled',
      // Etiquetas que crean las alertas (SweetAlert2) aunque no estén en el código
      /^h[1-6]$/, 'p', 'a', 'b', 'strong', 'small', 'hr', 'ul', 'ol', 'li', 'img', 'label', 'input', 'textarea', 'select', 'button', 'table'
    ],
    greedy: [/^recharts-/, /^swal2-/, /^go\d/, /data-bs-theme/] // data-bs-theme: modo claro/oscuro de Bootstrap
  }
}

const TIPOS = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }

/**
 * Archivos propios del restaurante (restaurantes/<id>/public: logo, fotos distintas).
 * Se suman a client/public y, si un archivo se llama igual, gana el del restaurante.
 */
function archivosDelRestaurante() {
  const publico = path.join(carpeta, 'public')
  let salida
  return {
    name: 'archivos-del-restaurante',
    configResolved(c) { salida = path.resolve(c.root, c.build.outDir) },
    // Ruta, nombre, subtítulo y color del restaurante en el HTML
    transformIndexHtml: (html) => html
      .replaceAll('%BASE%', BASE)
      .replaceAll('%NOMBRE_CORTO%', config.nombreCorto)
      .replaceAll('%SUBTITULO%', config.subtitulo)
      .replaceAll('%COLOR_TEMA%', config.marca.colorTema),
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || '').split('?')[0])
        if (!url.startsWith(BASE)) return next()
        const archivo = path.join(publico, url.slice(BASE.length))
        if (!archivo.startsWith(publico) || !fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) return next()
        res.setHeader('Content-Type', TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream')
        fs.createReadStream(archivo).pipe(res)
      })
    },
    closeBundle() {
      if (salida && fs.existsSync(publico)) fs.cpSync(publico, salida, { recursive: true })
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: BASE,
  plugins: [react(), archivosDelRestaurante()],
  resolve: { alias: { '@restaurante': carpeta } },
  css: {
    postcss: { plugins: command === 'build' ? [purgecss(PURGE)] : [] }
  },
  build: { outDir: `dist/${RESTAURANTE}`, emptyOutDir: true },
  server: {
    // En desarrollo, /<id>/api va al servidor Express local (sin el prefijo)
    proxy: { [`${BASE}api`]: { target: 'http://localhost:3000', rewrite: (p) => p.slice(BASE.length - 1) } },
    // Permite importar ../restaurantes/<id> (configuración común con el servidor)
    fs: { allow: ['..'] }
  }
}))
