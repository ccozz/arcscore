const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const jugadoresPath = path.join(__dirname, 'data', 'jugadores.json');
const reglasPath = path.join(__dirname, 'data', 'reglas.json');
const eventosDir = path.join(__dirname, 'data', 'eventos');
if (!fs.existsSync(eventosDir)) fs.mkdirSync(eventosDir);

// CARGA DE DATOS
function cargarJugadores() {
  return JSON.parse(fs.readFileSync(jugadoresPath, 'utf8'));
}
function cargarReglas() {
  return JSON.parse(fs.readFileSync(reglasPath, 'utf8'));
}

// RUTAS
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/jugadores', (req, res) => {
  const jugadores = cargarJugadores().sort((a, b) => a.nombre.localeCompare(b.nombre));
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

app.get('/registrar', (req, res) => {
  const jugadores = cargarJugadores().sort((a, b) => a.nombre.localeCompare(b.nombre));
  res.render('registrar', { jugadores });
});

app.post('/registrar', (req, res) => {
  let jugadores = cargarJugadores();
  const jugadoresMap = {};
  jugadores.forEach(j => jugadoresMap[j.nombre] = j);

  // FORM DATA
  const fecha = req.body.fecha || new Date().toISOString().split('T')[0];
  let equipoA = req.body.equipoA || [];
  let equipoB = req.body.equipoB || [];
  const ganador = req.body.ganador;
  const pechera = req.body.pechera;
  const bajas = req.body.bajas ? req.body.bajas.split(',') : [];
  const suplentes = req.body.suplentes ? req.body.suplentes.split(',') : [];
  const nuevoJugador = req.body.nuevoJugador?.trim();

  // AGREGAR NUEVO JUGADOR
  if (nuevoJugador && !jugadores.find(j => j.nombre === nuevoJugador)) {
    jugadores.push({
      nombre: nuevoJugador,
      partidos: 0,
      ganados: 0,
      empatados: 0,
      perdidos: 0,
      asistencia: 0,
      bajas: 0,
      reputacion: 0,
      puntos: 0
    });
    equipoA = equipoA.map(j => j === '__nuevo__' ? nuevoJugador : j);
    equipoB = equipoB.map(j => j === '__nuevo__' ? nuevoJugador : j);
    jugadoresMap[nuevoJugador] = jugadores[jugadores.length - 1];
  }

  const todosJugadores = [...equipoA, ...equipoB];

  // ACTUALIZAR DATOS
  todosJugadores.forEach(nombre => {
    const j = jugadoresMap[nombre];
    if (!j) return;

    j.partidos++;
    j.asistencia++;

    if ((equipoA.includes(nombre) && ganador === 'A') || (equipoB.includes(nombre) && ganador === 'B')) {
      j.ganados++;
      j.puntos += 3;
    } else if ((ganador === 'A' && equipoB.includes(nombre)) || (ganador === 'B' && equipoA.includes(nombre))) {
      j.perdidos++;
    } else {
      j.empatados++;
    }

    if ((equipoA.includes(nombre) && pechera === 'A') || (equipoB.includes(nombre) && pechera === 'B')) {
      j.puntos += 1;
    }
  });

  // BAJAS
  bajas.forEach(nombre => {
    const j = jugadoresMap[nombre];
    if (!j) return;
    j.bajas++;
    j.puntos -= 3;
  });

  // SUPLENTES
  suplentes.forEach(nombre => {
    const j = jugadoresMap[nombre];
    if (!j) return;
    j.asistencia++;
    j.puntos += 1;
  });

  // REPUTACIÓN
  jugadores.forEach(j => {
    j.reputacion = calcularReputacion(j);
  });

  // GUARDAR
  fs.writeFileSync(jugadoresPath, JSON.stringify(jugadores, null, 2), 'utf8');

  const evento = { fecha, equipoA, equipoB, ganador, pechera, bajas, suplentes };
  const eventoFile = path.join(eventosDir, `evento-${Date.now()}.json`);
  fs.writeFileSync(eventoFile, JSON.stringify(evento, null, 2), 'utf8');

  res.redirect('/ranking');
});

// REPUTACIÓN
function calcularReputacion(j) {
  const total = j.partidos + j.bajas;
  if (total === 0) return "Sin datos";
  const asistencia = j.partidos / total;
  const score = asistencia * 100 - j.bajas * 3;
  if (score >= 90) return "Legendaria";
  if (score >= 75) return "Alta";
  if (score >= 50) return "Media";
  if (score >= 25) return "Baja";
  return "Chota";
}

app.listen(3000, () => {
  console.log('ARC Score corriendo en http://localhost:3000');
});