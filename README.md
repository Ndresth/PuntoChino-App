# Punto Chino y Yahn Hong — POS, Cocina y Menú Web

Sistema para restaurantes: menú público con pedidos por WhatsApp, POS para meseras, pantalla de cocina en tiempo real y caja con arqueo, gastos, reportes y Excel. **Un solo código y un solo servicio de Render** para varios restaurantes, cada uno con su propia base de datos.

## Varios restaurantes en un solo servicio

| Dirección | Qué es |
|---|---|
| `/` | Portada: tarjeta de cada restaurante con Abierto/Cerrado, horario, dirección, teléfono, botón al menú y WhatsApp. No muestra el ingreso del personal (este entra por `/<id>/login`) |
| `/puntochino/` | Punto Chino: menú, `/puntochino/pos`, `/puntochino/cocina`, `/puntochino/admin` |
| `/yahnhong/` | Yahn Hong: menú, `/yahnhong/pos`, `/yahnhong/cocina`, `/yahnhong/admin` |
| `/pos`, `/cocina`, `/admin`, `/login` | Direcciones antiguas: redirigen a Punto Chino |
| `/api/health` | Salud de todos los restaurantes (para Render y UptimeRobot) |

**Cómo funciona:** `gateway/index.js` (la pasarela) arranca una copia de `server/` por restaurante, cada una con **su base de datos, sus claves y su JWT**, y reparte el tráfico por ruta. Si una copia se cae se reinicia sola y la otra sigue atendiendo. En el navegador, sesión, carrito, tema y ajustes de impresión se guardan **por restaurante** (`puntochino:token`, `yahnhong:token`...), así que no se mezclan aunque compartan dirección.

**Cada restaurante** está en `restaurantes/<id>/`:

| Archivo | Contenido |
|---|---|
| `config.json` | Nombre, NIT, dirección, teléfono, WhatsApp, categorías, categorías solo POS, desechables, horario y colores (`marca`) |
| `menu.json` | Menú inicial (solo lo usa `seed.js`) |
| `estilos.css` | Ajustes de colores propios (p. ej. la barra amarilla de Yahn Hong) |
| `public/images/` | Logo y fotos propias; las fotos comunes están en `client/public/images` |

**Agregar un restaurante:** copiar una carpeta de `restaurantes/` con otro `id` (solo minúsculas, números y guiones), editar sus datos, crear sus variables con prefijo (abajo) y desplegar. Aparece solo en la portada y en `/<id>/`. Mientras le falten variables se muestra como "Próximamente" y **nunca** usa la base de datos de otro restaurante.

**Mantenerlo despierto (UptimeRobot, gratis):** monitor HTTP(s) a `https://puntochino-web.onrender.com/api/health` cada 5 minutos. Un solo servicio 24/7 usa ~744 h de las 750 h gratis al mes de Render; por eso los restaurantes van juntos en un servicio y no en dos.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Interfaz | React 19 + Vite, **Bootstrap 5.3** + Bootstrap Icons, fuente Poppins servida por la app (`@fontsource`) |
| Modo claro/oscuro | Sistema de color de Bootstrap 5.3 (`data-bs-theme`). Botón sol/luna en la barra del personal y junto al buscador del menú; se recuerda en cada equipo (`public/tema.js` lo aplica antes de pintar) |
| Datos en el navegador | **TanStack Query** (`client/src/utils/queryClient.js`): caché compartida, reintentos si falla la red o el servidor, recarga al volver a la pestaña o al recuperar internet |
| CSS liviano | **PurgeCSS** en el build (`client/vite.config.js`): quita del CSS las clases que no se usan (~330 KB → ~78 KB). Las clases deben escribirse completas en el código (`'btn-success'`, nunca `'btn-' + color`) |
| Servidor | Express 5 + Mongoose 9, JWT, eventos en vivo (SSE), Helmet |
| Validación de la API | **Zod** (`server/lib/esquemas.js`): contrato de cada ruta; tipos estrictos, campos desconocidos descartados, errores 400 en español con el campo exacto |

## Módulos

| Ruta | Quién | Qué hace |
|---|---|---|
| `/<id>/` | Clientes | Menú con buscador, indicador **Abierto/Cerrado**, carrito con **Domicilio** o **Recoger en el local**, "lo antes posible" o **a una hora** de hoy. El pedido queda registrado y se envía por WhatsApp |
| `/<id>/pos` | Admin, cajero, mesera | Menú a la izquierda y cuenta fija a la derecha. Un toque en el tamaño agrega el producto. Mesas en cuadrícula (las ocupadas se ven en naranja), para llevar o domicilio y método de pago |
| `/<id>/cocina` | Todos los roles | Órdenes en vivo con cronómetro (amarillo a los 10 min, rojo a los 20), flujo Pendiente → Preparando → Listo → Entregado, sonido e impresión automática opcional. Los pedidos **programados** esperan en una franja aparte y entran a la fila 30 min antes de su hora |
| `/<id>/admin` | Admin, cajero | Resumen del turno, desglose por método de pago, gastos, órdenes del turno (reimprimir, corregir pago, anular), productos agotados, arqueo y cierre, impresora y **Ajustes** (días cerrados). El admin además tiene inventario completo, **Reportes**, usuarios y respaldo |

## Uso rápido

- **Menú web:** el botón **+** de cada tarjeta agrega con un toque los productos de un solo precio y muestra cuántos lleva el cliente; si hay varios tamaños abre el detalle.
- **POS:** botón **Fotos / Lista** junto al buscador (la vista **Lista** muestra unas 3 veces más productos y se recuerda en cada equipo). Teclado: **/** enfoca el buscador, **Enter** agrega el producto si la búsqueda deja uno solo con un solo precio, **Esc** limpia.
- **Caja → Órdenes:** filtros **En cocina / Listas / Entregadas / Anuladas** y botón **Entregar** en las órdenes listas.
- **Caja → Inventario:** filtros por categoría y **Agotados**.

## Adiciones y pago dividido (POS)

- **Adicionar a un pedido en cocina:** al tocar una mesa ocupada aparece "Adicionar a #N"; para llevar o domicilio, botón **Adicionar a un pedido que ya está en cocina**. Los productos nuevos suman al total, la orden vuelve a cocina si ya estaba lista o entregada, y en cocina se resaltan con la hora de la adición (sonido y comanda "ADICIÓN" solo con lo nuevo).
- **Pago dividido:** en el POS, **Dividir pago entre varios métodos** (hasta 4); en Caja → Órdenes, opción **Dividir pago…** en la columna Pago. La última parte se calcula sola. Cada parte suma a su método en caja, cierre, reportes y Excel. Si a una orden con pago dividido se le adiciona, el pago queda en el método de mayor valor y caja debe ajustarlo.
- **Categorías solo POS:** `categoriasSoloPos` en `restaurantes/<id>/config.json` (Punto Chino: **Cajas** y **Salsas**; Yahn Hong: **Combos**, **Cajas** y **Salsas**). Se venden en el POS pero no salen en el menú web ni se pueden pedir desde la web.
- **Tamaños:** se muestran como **1x** (familiar), **1/2** (mediano) y **1/4** (personal) en POS, web, cocina, facturas y reportes. En la BD siguen siendo `familiar`/`mediano`/`personal`.
- **Consecutivo de domicilios:** cada domicilio (POS o web) recibe `numeroDomicilio` 1, 2, 3… que arranca en 1 cada día (hora de Colombia), aparte del `numero` general de la orden. Contador en `counters` con id `domicilio-AAAA-MM-DD`.

## Horario de atención

Se define en `restaurantes/<id>/config.json` (lo usan servidor y cliente) y se valida en el servidor (`server/lib/horario.js`):

- **Punto Chino:** lunes a sábado 11:30 a. m. – 6:30 p. m.; domingos y **festivos de Colombia** 11:30 a. m. – 3:30 p. m.
- **Yahn Hong:** todos los días 11:30 a. m. – 8:00 p. m., domingos y festivos incluidos.
- Los festivos se calculan solos (Ley Emiliani y Semana Santa).
- Abierto: el cliente pide "lo antes posible" o programa una hora hasta el cierre. Antes de abrir solo puede programar para hoy. Después del cierre no se reciben pedidos web.
- **Caja → Ajustes → Días sin pedidos web**: "Cerrar pedidos web por hoy" o programar días especiales (24 y 31 de diciembre, imprevistos).
- El POS no tiene restricción de horario.

## Reportes (admin)

**Caja → Reportes**: semana, mes o rango de fechas, con comparación contra el periodo anterior, ventas por día, métodos de pago, tipo de pedido, horas de más venta, productos más vendidos y tabla por día. Al tocar un día se ve su detalle (órdenes, productos, gastos). Se calcula por la fecha de cada orden: el cierre de caja no borra nada.

## Desechables

En el carrito del POS y del menú web hay un bloque **Desechables**:
- Cucharas: gratis, máximo 6.
- Platos: $300 c/u, máximo 10 (se suman al total).
- Vasos: gratis, máximo 6. Sólo aparecen si el pedido tiene un producto de la categoría **Bebidas**.

Precios y límites se configuran en `restaurantes/<id>/config.json` y se validan en el servidor (`server/lib/desechables.js`).

## Cierre de caja

**Caja → Arqueo y cierre** abre un asistente de 4 pasos:

1. **Resumen:** ventas por método y efectivo esperado. Avisa si quedan órdenes en cocina.
2. **Efectivo:** se escribe el total de efectivo que hay en la caja.
3. **Confirmar:** muestra si cuadra, sobra o falta.
4. **Excel obligatorio:** al cerrar se descarga `Cierre_AAAA-MM-DD.xlsx` (hojas Resumen, Ventas, Productos y Gastos). No se puede terminar sin descargarlo; si se recarga la página, el asistente vuelve a este paso. También permite imprimir el resumen del cierre en la térmica.

## Acceso del personal

El menú público no muestra ningún botón de acceso. El personal entra escribiendo `/login` al final de la dirección (por ejemplo `https://<tu-app>.onrender.com/login`).

- **Usuarios individuales** (recomendado): **Caja → Ajustes → Usuarios del personal**. Cada persona entra con su nombre y su clave, y queda registrado quién tomó, anuló o cerró. Desactivar a alguien o cambiarle la clave cierra sus sesiones al instante.
- **Claves compartidas por rol** (variables de entorno): siguen funcionando. Con el interruptor **Solo usuarios individuales** dejan de servir, salvo la del admin (para no quedar por fuera).

## Variables de entorno (Render → Environment)

Ver `server/.env.example`. **Punto Chino** (restaurante principal) usa las variables sin prefijo. **Cada otro restaurante** usa las mismas con su prefijo: `YAHNHONG_MONGO_URI`, `YAHNHONG_JWT_SECRET`, `YAHNHONG_ADMIN_PASSWORD`, etc. Un restaurante sin `<PREFIJO>_MONGO_URI` y `<PREFIJO>_JWT_SECRET` no arranca (sale "Próximamente").

| Variable | Obligatoria | Nota |
|---|---|---|
| `MONGO_URI` | Sí | Cadena de conexión de Atlas, terminada en el nombre de la base del restaurante (`/puntochino`, `/yahnhong`) |
| `JWT_SECRET` | Sí | **Mínimo 32 caracteres aleatorios**. Si se cambia, todos deben volver a iniciar sesión |
| `ADMIN_PASSWORD`, `CAJERO_PASSWORD`, `MESERA_PASSWORD` | Sí | Una por rol |
| `COCINA_PASSWORD` | No | Crea el rol "cocina", que sólo ve `/cocina` |
| `CORS_ORIGIN` | No | Sólo si el frontend vive en otro dominio |
| `MEMORIA_POR_RESTAURANTE` | No | MB de memoria por copia del servidor (180 por defecto; Render gratis tiene 512 MB en total) |

## Despliegue en Render

- Build command: `npm run build`
- Start command: `npm start` (arranca la pasarela, que arranca un servidor por restaurante)
- Health check path: `/api/health`

El plan gratuito se duerme tras 15 minutos sin tráfico. El menú muestra la última copia guardada en el navegador mientras el servidor despierta. Para evitarlo, UptimeRobot (ver arriba).

## Impresión (térmica 58/80 mm)

En **Caja → Impresora** de cada equipo se elige el ancho del papel, las copias y la impresión automática, y hay botones de prueba.

- En el cuadro de impresión: Márgenes **Ninguno**, Escala **100%** y sin encabezados ni pies de página.
- Para imprimir sin el cuadro de diálogo (ideal en cocina): acceso directo de Chrome con `--kiosk-printing` y la térmica como impresora predeterminada.
- Active la impresión automática en **un solo** equipo, o saldrán comandas duplicadas.

## Respaldos

El plan gratuito de Atlas **no hace copias de seguridad**.

- **Manual:** Caja → Ajustes → **Descargar respaldo completo** (JSON con menú, pedidos, cierres, gastos, ajustes y usuarios). Guárdelo fuera del computador del local; tiene datos de clientes.
- **Automático semanal (GitHub Actions):** `.github/workflows/respaldo.yml` corre los lunes 6:00 a. m., un respaldo por restaurante. Secretos en GitHub → Settings → Secrets and variables → Actions: `BACKUP_PASSWORD` (una clave larga que usted guarde aparte), `MONGO_URI` (Punto Chino) y `YAHNHONG_MONGO_URI` (Yahn Hong). Si falta el de un restaurante, solo ese se omite. Como el repositorio es público, el archivo se sube **cifrado** y se conserva 90 días en Actions → *Respaldo semanal* → Artifacts. Para descifrarlo:
  ```bash
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in respaldo-AAAA-MM-DD.json.gz.enc -pass pass:SU_CLAVE | gunzip > respaldo.json
  ```
  GitHub pausa los workflows programados si el repositorio pasa 60 días sin cambios; se reactivan desde la pestaña Actions.
- **Restaurar:** `cd server && node scripts/restaurar.js respaldo.json --confirmar` (reemplaza por `_id` sin borrar lo demás; `--reemplazar` vacía cada colección antes). Escribe en la BD de `MONGO_URI`: úselo con cuidado.
- **Nunca** ejecute `node seed.js --force` sobre la BD real: borra el menú.

## Salud del servicio

`/api/health` (de la pasarela) responde **503** si algún restaurante configurado está caído o sin conexión con MongoDB, con el detalle por restaurante (`ok`, `sin base de datos`, `caído`, `sin configurar`). `/<id>/api/health` da la salud de uno solo. Si Atlas no responde al arrancar, el servidor reintenta la conexión cada vez con más espera (hasta 60 s).

## Seguridad

- El servidor calcula **todos** los precios y totales con la base de datos; el navegador sólo envía producto, tamaño y cantidad.
- Cada endpoint valida el rol en el servidor (antes sólo se validaba en el frontend).
- Límite de intentos: login 10 fallos cada 15 min por IP; pedidos web 8 cada 10 min por IP.
- Cabeceras de seguridad con Helmet (incluye CSP) y cuerpo máximo de 100 KB.
- Todo lo que se imprime se escapa (evita inyectar HTML o scripts desde un pedido web).
- Toda entrada pasa por un esquema **Zod**: un objeto con operadores de Mongo (`{"$ne": null}`) donde va texto o número se rechaza antes de llegar a la BD.
- Sin recursos de terceros para mostrar la página (fuentes locales); la CSP solo permite el propio dominio.

## Pruebas y CI

- `cd server && npm test`: pruebas del servidor (precios, desechables, horario y festivos, Recoger/hora programada, usuarios y sesiones, reportes, respaldo, validación Zod, configuración de cada restaurante y la pasarela). No necesitan base de datos.
- `.github/workflows/ci.yml` corre en cada PR y en `main`: pruebas del servidor, lint y build del cliente.

## Configuración de cada restaurante

`restaurantes/<id>/config.json`: datos del negocio, categorías, desechables (precios, límites), horario y colores. Lo leen el servidor (validación) y el cliente (pantallas); se edita en un solo lugar. El cliente se compila una vez por restaurante (`client/dist/<id>`).

## Desarrollo local

```bash
npm run build          # instala server y client y compila el frontend de cada restaurante
cp server/.env.example server/.env   # y complete los valores (YAHNHONG_* para Yahn Hong)
npm start              # pasarela en http://localhost:3000 (portada, /puntochino, /yahnhong)
# Un solo servidor sin pasarela: npm run start:servidor  (RESTAURANTE=yahnhong para Yahn Hong)
# Frontend con recarga en caliente: cd client && npm run dev   (RESTAURANTE=yahnhong npm run dev)
```

`RESTAURANTE=<id> node server/seed.js --force` **borra** el menú de ese restaurante y lo recarga desde `restaurantes/<id>/menu.json`.
