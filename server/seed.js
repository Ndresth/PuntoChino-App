require('dotenv').config(); // Cargar variables de entorno
const mongoose = require('mongoose');
const Product = require('./models/ProductModel');
const menuData = require('./menu.json');

// AHORA ES SEGURO: Busca la variable, no la escribe directo
const MONGO_URI = process.env.MONGO_URI; 

if (!MONGO_URI) {
  console.error("❌ Error: Falta MONGO_URI en el archivo .env");
  process.exit(1);
}

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB Atlas (Seed)');

    await Product.deleteMany({});
    console.log('🧹 Datos previos borrados');

    await Product.insertMany(menuData);
    console.log('🚀 ¡Menú de Punto Chino cargado exitosamente!');

    process.exit();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
};

seedDB();