// server/models/CierreModel.js
const mongoose = require('mongoose');

const CierreSchema = new mongoose.Schema({
  fechaInicio: { type: Date, required: true },
  fechaFin: { type: Date, default: Date.now },
  
  totalVentasSistema: { type: Number, required: true }, 
  totalGastos: { type: Number, default: 0 },          // <--- NUEVO: Salidas justificadas
  totalCajaTeorico: { type: Number, required: true }, // <--- NUEVO: (Ventas - Gastos)
  
  totalEfectivoReal: { type: Number, required: true },  // Lo que contaron billete a billete
  diferencia: { type: Number, required: true },         // (Real - Teorico)
  
  cantidadPedidos: { type: Number, default: 0 },
  usuario: { type: String, default: 'Admin' }
});

module.exports = mongoose.model('Cierre', CierreSchema);