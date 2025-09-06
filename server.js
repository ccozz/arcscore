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

app.get('/historial', (req, res) => {
  const archivos = fs.readdirSync(eventosDir);
  const historial = archivos
    .filter(nombre => nombre.endsWith('.json'))
    .map(nombre => {
      const evento = JSON.parse(fs.readFileSync(path.join(eventosDir, nombre), 'utf8'));
      evento.id = nombre.replace('.json', '');
      return evento;
    })
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // orden descendente por fecha

  res.render('historial', { historial }); // <- ESTA LÍNEA ES LA CLAVE
});

// Ruta para obtener los datos de un evento específico (GET)
app.get('/evento/:id', (req, res) => {
  const eventoPath = path.join(eventosDir, `${req.params.id}.json`);
  if (!fs.existsSync(eventoPath)) return res.status(404).send('Evento no encontrado');
  const evento = JSON.parse(fs.readFileSync(eventoPath, 'utf8'));
  const jugadores = cargarJugadores().sort((a, b) => a.nombre.localeCompare(b.nombre));
  res.render('editar-evento', { evento, jugadores, id: req.params.id });
});

// Ruta para procesar la edición del evento (POST)
app.post('/evento/:id', (req, res) => {
  const eventoPath = path.join(eventosDir, `${req.params.id}.json`);
  if (!fs.existsSync(eventoPath)) return res.status(404).send('Evento no encontrado');

  const viejo = JSON.parse(fs.readFileSync(eventoPath, 'utf8'));
  let jugadores = cargarJugadores();
  const jugadoresMap = {};
  jugadores.forEach(j => jugadoresMap[j.nombre] = j);

  // Revertir impacto del evento anterior
  const revertir = (nombre, campo, valor) => {
    if (jugadoresMap[nombre]) jugadoresMap[nombre][campo] -= valor;
  };

  const todosAnteriores = [...viejo.equipoA, ...viejo.equipoB];
  todosAnteriores.forEach(n => revertir(n, 'partidos', 1));
  viejo.equipoA.forEach(n => {
    if (viejo.ganador === 'A') revertir(n, 'ganados', 1), revertir(n, 'puntos', 3);
    else if (viejo.ganador === 'B') revertir(n, 'perdidos', 1);
    else revertir(n, 'empatados', 1);
    if (viejo.pechera === 'A') revertir(n, 'puntos', 1);
    revertir(n, 'asistencia', 1);
  });
  viejo.equipoB.forEach(n => {
    if (viejo.ganador === 'B') revertir(n, 'ganados', 1), revertir(n, 'puntos', 3);
    else if (viejo.ganador === 'A') revertir(n, 'perdidos', 1);
    else revertir(n, 'empatados', 1);
    if (viejo.pechera === 'B') revertir(n, 'puntos', 1);
    revertir(n, 'asistencia', 1);
  });
  (viejo.bajas || []).forEach(n => {
    revertir(n, 'bajas', 1);
    revertir(n, 'puntos', -3);
  });
  (viejo.suplentes || []).forEach(n => {
    revertir(n, 'asistencia', 1);
    revertir(n, 'puntos', 1);
  });

  // Procesar nuevo evento
  const fecha = req.body.fecha;
  const equipoA = req.body.equipoA || [];
  const equipoB = req.body.equipoB || [];
  const ganador = req.body.ganador;
  const pechera = req.body.pechera;
  const bajas = req.body.bajas ? req.body.bajas.split(',') : [];
  const suplentes = req.body.suplentes ? req.body.suplentes.split(',') : [];

  const todos = [...equipoA, ...equipoB];
  todos.forEach(n => jugadoresMap[n] && (jugadoresMap[n].partidos++, jugadoresMap[n].asistencia++));

  equipoA.forEach(n => {
    if (ganador === 'A') jugadoresMap[n].ganados++, jugadoresMap[n].puntos += 3;
    else if (ganador === 'B') jugadoresMap[n].perdidos++;
    else jugadoresMap[n].empatados++;
    if (pechera === 'A') jugadoresMap[n].puntos += 1;
  });
  equipoB.forEach(n => {
    if (ganador === 'B') jugadoresMap[n].ganados++, jugadoresMap[n].puntos += 3;
    else if (ganador === 'A') jugadoresMap[n].perdidos++;
    else jugadoresMap[n].empatados++;
    if (pechera === 'B') jugadoresMap[n].puntos += 1;
  });

  bajas.forEach(n => {
    jugadoresMap[n].bajas++;
    jugadoresMap[n].puntos -= 3;
  });

  suplentes.forEach(n => {
    jugadoresMap[n].asistencia++;
    jugadoresMap[n].puntos += 1;
  });

  // Reputación
  jugadores.forEach(j => {
    j.reputacion = calcularReputacion(j);
  });

  // Guardar
  fs.writeFileSync(jugadoresPath, JSON.stringify(jugadores, null, 2), 'utf8');
  const nuevoEvento = { fecha, equipoA, equipoB, ganador, pechera, bajas, suplentes };
  fs.writeFileSync(eventoPath, JSON.stringify(nuevoEvento, null, 2), 'utf8');

  res.redirect('/historial');
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