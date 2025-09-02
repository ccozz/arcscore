const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

const jugadoresPath = path.join(__dirname, 'data', 'jugadores.json');
const reglasPath = path.join(__dirname, 'data', 'reglas.json');

function cargarJugadores() {
  return JSON.parse(fs.readFileSync(jugadoresPath, 'utf8'));
}

function cargarReglas() {
  return JSON.parse(fs.readFileSync(reglasPath, 'utf8'));
}

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/jugadores', (req, res) => {
  const jugadores = cargarJugadores();
  res.render('jugadores', { jugadores });
});

app.get('/ranking', (req, res) => {
  const jugadores = cargarJugadores();
  const ordenados = [...jugadores].sort((a, b) => b.puntos - a.puntos);
  res.render('ranking', { jugadores: ordenados });
});

app.get('/reglas', (req, res) => {
  const reglas = cargarReglas();
  res.render('reglas', { reglas });
});

app.listen(3000, () => {
  console.log('ARC Score corriendo en http://localhost:3000');
});