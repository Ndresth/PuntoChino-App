// server/models/GastoModel.js
const mongoose = require('mongoose');

const GastoSchema = new mongoose.Schema({
  descripcion: { type: String, required: true }, // Ej: "Hielo", "Taxi", "Adelanto"
  monto: { type: Number, required: true },
  fecha: { type: Date, default: Date.now },
  usuario: { type: String, default: 'Cajero' },
  // Vinculamos el gasto al cierre de caja actual
  cierre_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cierre', default: null } 
});

module.exports = mongoose.model('Gasto', GastoSchema);