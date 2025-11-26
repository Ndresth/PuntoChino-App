const express = require('express');
const cors = require('cors');
const path = require('path'); // Esta librería es nativa, no requiere instalación
const menuData = require('./menu.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Servir las imágenes estáticas (Fotos de los arroces)
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// 2. API Routes
app.get('/api/productos', (req, res) => {
    res.json(menuData);
});

// 3. --- INTEGRACIÓN CON FRONTEND ---
// Servir los archivos estáticos de React
app.use(express.static(path.join(__dirname, '../client/dist')));

// --- LA CORRECCIÓN CLAVE ESTÁ AQUÍ ABAJO ---
// Usamos /.*/ en lugar de '*' para evitar el error "PathError" en servidores nuevos
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`--- SERVIDOR PUNTO CHINO CORRIENDO EN PUERTO ${PORT} ---`);
});