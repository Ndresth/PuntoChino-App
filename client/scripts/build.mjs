// Compila el cliente una vez por restaurante (restaurantes/<id>) en client/dist/<id>.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('../../restaurantes/', import.meta.url))
const vite = path.join(path.dirname(createRequire(import.meta.url).resolve('vite/package.json')), 'bin/vite.js')
const ids = fs.readdirSync(raiz).filter(d => fs.existsSync(path.join(raiz, d, 'config.json')))
const pedidos = process.argv.slice(2)

for (const id of pedidos.length ? pedidos : ids) {
  console.log(`\n=== ${id} ===`)
  const r = spawnSync(process.execPath, [vite, 'build'], { stdio: 'inherit', env: { ...process.env, RESTAURANTE: id } })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
