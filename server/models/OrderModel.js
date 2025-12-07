const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  
  // Nuevos campos
  tipo: { type: String, required: true }, // 'Mesa' o 'Domicilio'
  numeroMesa: { type: String, default: null },

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
      tamaño: String,
      nota: { type: String, default: '' } // <--- EL CAMPO IMPORTANTE
    }
  ],
  total: Number,
  estado: { type: String, default: 'Pendiente' },
  cierre_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cierre', default: null } 
});

module.exports = mongoose.model('Order', OrderSchema);