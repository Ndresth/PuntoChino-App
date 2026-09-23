# Punto Chino — POS, Cocina y Menú Web

Sistema para restaurante: menú público con pedidos por WhatsApp, POS para meseras, pantalla de cocina en tiempo real y caja con arqueo, gastos, reportes y Excel.

## Módulos

| Ruta | Quién | Qué hace |
|---|---|---|
| `/` | Clientes | Menú con buscador, carrito, pedido a domicilio que queda registrado y se envía por WhatsApp |
| `/pos` | Admin, cajero, mesera | Menú a la izquierda y cuenta fija a la derecha. Un toque en el tamaño agrega el producto. Mesas en cuadrícula (las ocupadas se ven en naranja), para llevar o domicilio y método de pago |
| `/cocina` | Todos los roles | Órdenes en vivo con cronómetro (amarillo a los 10 min, rojo a los 20), flujo Pendiente → Preparando → Listo → Entregado, sonido e impresión automática opcional |
| `/admin` | Admin, cajero | Resumen del turno, desglose por método de pago, gastos, órdenes del turno (reimprimir, corregir pago, anular), productos agotados, arqueo y cierre, configuración de impresora. El admin además tiene inventario completo, reportes y Excel |

## Cierre de caja

**Caja → Arqueo y cierre** abre un asistente de 4 pasos:

1. **Resumen:** ventas por método y efectivo esperado. Avisa si quedan órdenes en cocina.
2. **Conteo:** por billetes (100k … 1k más monedas) o escribiendo el total directo.
3. **Confirmar:** muestra si cuadra, sobra o falta.
4. **Excel obligatorio:** al cerrar se descarga `Cierre_AAAA-MM-DD.xlsx` (hojas Resumen, Ventas, Productos y Gastos). No se puede terminar sin descargarlo; si se recarga la página, el asistente vuelve a este paso. También permite imprimir el resumen del cierre en la térmica.

## Variables de entorno (Render → Environment)

Ver `server/.env.example`.

| Variable | Obligatoria | Nota |
|---|---|---|
| `MONGO_URI` | Sí | Cadena de conexión de Atlas |
| `JWT_SECRET` | Sí | **Mínimo 32 caracteres aleatorios**. Si se cambia, todos deben volver a iniciar sesión |
| `ADMIN_PASSWORD`, `CAJERO_PASSWORD`, `MESERA_PASSWORD` | Sí | Una por rol |
| `COCINA_PASSWORD` | No | Crea el rol "cocina", que sólo ve `/cocina` |
| `CORS_ORIGIN` | No | Sólo si el frontend vive en otro dominio |

## Despliegue en Render

- Build command: `npm run build`
- Start command: `npm start`
- Health check path: `/api/health`

El plan gratuito se duerme tras 15 minutos sin tráfico. El menú muestra la última copia guardada en el navegador mientras el servidor despierta. Para evitar que se duerma, configure un monitor gratuito (por ejemplo UptimeRobot) que haga ping a `/api/health` cada 10 minutos: un solo servicio 24/7 gasta ~730 h, dentro de las 750 h gratuitas al mes.

## Impresión (térmica 58/80 mm)

En **Caja → Impresora** de cada equipo se elige el ancho del papel, las copias y la impresión automática, y hay botones de prueba.

- En el cuadro de impresión: Márgenes **Ninguno**, Escala **100%** y sin encabezados ni pies de página.
- Para imprimir sin el cuadro de diálogo (ideal en cocina): acceso directo de Chrome con `--kiosk-printing` y la térmica como impresora predeterminada.
- Active la impresión automática en **un solo** equipo, o saldrán comandas duplicadas.

## Seguridad

- El servidor calcula **todos** los precios y totales con la base de datos; el navegador sólo envía producto, tamaño y cantidad.
- Cada endpoint valida el rol en el servidor (antes sólo se validaba en el frontend).
- Límite de intentos: login 10 fallos cada 15 min por IP; pedidos web 8 cada 10 min por IP.
- Cabeceras de seguridad con Helmet (incluye CSP) y cuerpo máximo de 100 KB.
- Todo lo que se imprime se escapa (evita inyectar HTML o scripts desde un pedido web).

## Desarrollo local

```bash
npm run build          # instala server y client y compila el frontend
cp server/.env.example server/.env   # y complete los valores
npm start              # http://localhost:3000
# Frontend con recarga en caliente: cd client && npm run dev
```

`node server/seed.js --force` **borra** el menú y lo recarga desde `server/menu.json`.
