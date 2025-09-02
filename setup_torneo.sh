#!/bin/bash

echo "🔥 Iniciando estructura base del torneo en Miramar..."

# Carpetas principales
mkdir -p data/jugadores
mkdir -p data/eventos
mkdir -p data/logs
mkdir -p config

# Archivos base
touch data/logs/torneo.log
touch config/reglas.txt
touch config/jugadores_iniciales.txt

# Mensaje de bienvenida en el log
echo "[$(date)] Estructura creada por Cristian. Torneo listo para cargar jugadores y eventos." >> data/logs/torneo.log

# Plantilla de reglas (vacía, para que la completes después)
echo "🏆 Reglas del torneo (completá desde acá)" > config/reglas.txt

# Plantilla de jugadores frecuentes (para que pegues tu lista)
cat <<EOF > config/jugadores_iniciales.txt
Cri
Borra
Luqui
H
Cefe
Choncho
Geri
Ima
Laucha
Pocho
Lobo
Lucho
Marcos
Maty
Nico
Osval
Perro Loco
Rafa
Rovle
Tin
EOF

echo "✅ Setup completo. Estructura lista para avanzar paso a paso."