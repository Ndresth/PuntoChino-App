const path = require('path');

/**
 * Configuración del restaurante que atiende ESTE proceso (restaurantes/<id>/config.json).
 * La pasarela (gateway/index.js) arranca una copia del servidor por restaurante con
 * RESTAURANTE=<id>; sin la variable se usa Punto Chino (desarrollo y pruebas).
 */
const ID = process.env.RESTAURANTE || 'puntochino';
if (!/^[a-z0-9-]+$/.test(ID)) throw new Error(`RESTAURANTE inválido: "${ID}"`);

const carpeta = path.join(__dirname, '../../restaurantes', ID);
const config = require(path.join(carpeta, 'config.json'));

module.exports = { ...config, id: ID, carpeta };
