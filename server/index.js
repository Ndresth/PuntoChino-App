const express = require('express');
const cors = require('cors');
const path = require('path'); // Importamos path para manejar rutas
const menuData = require('./menu.json');

const app = express();
// En la nube, Render nos dará un puerto automáticamente en process.env.PORT
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
// Decimos a Node que sirva los archivos estáticos de React (carpeta dist)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Cualquier petición que no sea API ni imágenes, manda al index.html de React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`--- SERVIDOR PUNTO CHINO CORRIENDO EN PUERTO ${PORT} ---`);
});