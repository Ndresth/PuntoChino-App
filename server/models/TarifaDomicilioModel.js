const mongoose = require('mongoose');

/**
 * Valor del domicilio aprendido por dirección: cada vez que caja o el POS cobran un domicilio,
 * se guarda (o actualiza) lo cobrado. Si alguien vuelve a pedir a la misma dirección, se usa solo.
 * _id = dirección normalizada (ver lib/domicilios.js).
 */
const TarifaDomicilioSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  direccion: { type: String, default: '' }, // Última forma escrita (para mostrar)
  valor: { type: Number, required: true },
  usos: { type: Number, default: 0 },
  actualizado: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.model('TarifaDomicilio', TarifaDomicilioSchema);
