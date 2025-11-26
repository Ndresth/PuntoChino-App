const express = require('express');
const cors = require('cors');
const menuData = require('./menu.json');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/productos', (req, res) => {
    res.json(menuData);
});

app.listen(3000, () => {
    console.log('--- SERVIDOR CORRIENDO EN PUERTO 3000 ---');
});