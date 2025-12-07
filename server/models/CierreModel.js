// server/models/CierreModel.js
const mongoose = require('mongoose');

const CierreSchema = new mongoose.Schema({
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, default: Date.now },
  totalVentasSistema: { type: Number, required: true }, // Lo que la computadora dice que se vendió
  totalEfectivoReal: { type: Number, required: true },  // Lo que el cajero contó en billetes
  diferencia: { type: Number, required: true },         // Si falta dinero, saldrá negativo
  cantidadPedidos: { type: Number, default: 0 },
  usuario: { type: String, default: 'Admin' }
});

module.exports = mongoose.model('Cierre', CierreSchema);