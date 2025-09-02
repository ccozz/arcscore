#!/bin/bash

echo "⚙️ Inicializando archivos de puntos para cada jugador..."

jugadores_dir="data/jugadores"

# Verificamos que la carpeta exista
if [ ! -d "$jugadores_dir" ]; then
  echo "❌ Carpeta de jugadores no encontrada: $jugadores_dir"
  exit 1
fi

# Iteramos sobre cada jugador
for jugador in "$jugadores_dir"/*; do
  if [ -d "$jugador" ]; then
    archivo_puntos="$jugador/puntos.txt"
    if [ ! -f "$archivo_puntos" ]; then
      echo "0" > "$archivo_puntos"
      echo "🟢 Puntos inicializados para $(basename "$jugador")"
    else
      echo "🟡 Ya existía puntos.txt para $(basename "$jugador")"
    fi
  fi
done

echo "✅ Todos los jugadores tienen su archivo de puntos listo."