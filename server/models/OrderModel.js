// server/models/OrderModel.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  cliente: {
    nombre: String,
    telefono: String,
    direccion: String,
    metodoPago: String
  },
  items: [
    {
      nombre: String,
      cantidad: Number,
      precio: Number,
      tamaño: String
    }
  ],
  total: Number,
  estado: { type: String, default: 'Pendiente' },
  
  // --- NUEVO CAMPO DE SEGURIDAD ---
  // Si es null, la orden es del turno actual.
  // Si tiene un ID, ya fue cerrada y archivada.
  cierre_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cierre', default: null } 
});

module.exports = mongoose.model('Order', OrderSchema);