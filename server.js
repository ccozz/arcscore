const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

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

app.get('/registrar', (req, res) => {
  const jugadores = cargarJugadores();
  res.render('registrar', { jugadores });
});

const eventosDir = path.join(__dirname, 'data', 'eventos');
if (!fs.existsSync(eventosDir)) fs.mkdirSync(eventosDir); // crear si no existe

app.post('/registrar', (req, res) => {
  let jugadores = cargarJugadores();

  // Extraer datos del formulario
  const equipoA = req.body.equipoA || [];
  const equipoB = req.body.equipoB || [];
  const ganador = req.body.ganador;
  const pechera = req.body.pechera;
  const bajas = req.body.bajas ? req.body.bajas.split(',') : [];
  const suplentes = req.body.suplentes ? req.body.suplentes.split(',') : [];
  const nuevoJugador = req.body.nuevoJugador?.trim();

  // Agregar nuevo jugador si no existe y fue ingresado
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

    // Reemplazar "__nuevo__" en equipoA o equipoB por el nombre ingresado
    for (let i = 0; i < equipoA.length; i++) {
      if (equipoA[i] === '__nuevo__') equipoA[i] = nuevoJugador;
    }
    for (let i = 0; i < equipoB.length; i++) {
      if (equipoB[i] === '__nuevo__') equipoB[i] = nuevoJugador;
    }
  }

  // Agrupar jugadores por nombre
  const jugadoresMap = {};
  jugadores.forEach(j => {
    jugadoresMap[j.nombre] = j;
  });

  const todosJugadores = [...equipoA, ...equipoB];

  // Aplicar lógica de puntos
  todosJugadores.forEach(nombre => {
    const jugador = jugadoresMap[nombre];
    if (!jugador) return;

    jugador.partidos += 1;
    jugador.asistencia += 1;

    if (equipoA.includes(nombre) && ganador === 'A') jugador.ganados += 1;
    else if (equipoB.includes(nombre) && ganador === 'B') jugador.ganados += 1;
    else if ((ganador === 'A' && equipoB.includes(nombre)) || (ganador === 'B' && equipoA.includes(nombre))) {
      jugador.perdidos += 1;
    } else {
      jugador.empatados += 1;
    }

    // Sumar puntos por victoria
    if ((equipoA.includes(nombre) && ganador === 'A') || (equipoB.includes(nombre) && ganador === 'B')) {
      jugador.puntos += 3;
    }

    // Gol de pechera
    if ((equipoA.includes(nombre) && pechera === 'A') || (equipoB.includes(nombre) && pechera === 'B')) {
      jugador.puntos += 1;
    }
  });

  // Bajas (-3)
  bajas.forEach(nombre => {
    if (!jugadoresMap[nombre]) return;
    jugadoresMap[nombre].bajas += 1;
    jugadoresMap[nombre].puntos -= 3;
  });

  // Suplentes (+1)
  suplentes.forEach(nombre => {
    if (!jugadoresMap[nombre]) return;
    jugadoresMap[nombre].asistencia += 1;
    jugadoresMap[nombre].puntos += 1;
  });

  // Calcular reputación
  jugadores.forEach(j => {
    j.reputacion = calcularReputacion(j);
  });

  // Guardar jugadores
  fs.writeFileSync(jugadoresPath, JSON.stringify(jugadores, null, 2), 'utf8');

  // Guardar evento
  const evento = {
    fecha: new Date().toISOString(),
    equipoA,
    equipoB,
    ganador,
    pechera,
    bajas,
    suplentes
  };

  const eventoFile = path.join(eventosDir, `evento-${Date.now()}.json`);
  fs.writeFileSync(eventoFile, JSON.stringify(evento, null, 2), 'utf8');

  // Redirigir a ranking
  res.redirect('/ranking');
});

function calcularReputacion(jugador) {
  const total = jugador.partidos + jugador.bajas;
  if (total === 0) return "Sin datos";

  const asistenciaRate = jugador.partidos / total;
  const score = asistenciaRate * 100 - jugador.bajas * 3;

  if (score >= 90) return "Legendaria";
  if (score >= 75) return "Alta";
  if (score >= 50) return "Media";
  if (score >= 25) return "Baja";
  return "Chota";
}

app.listen(3000, () => {
  console.log('ARC Score corriendo en http://localhost:3000');
});