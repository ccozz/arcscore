#!/bin/bash

echo "⚙️ Generando perfiles individuales de jugadores..."

# Ruta al archivo de jugadores
archivo_jugadores="config/jugadores_iniciales.txt"

# Verificamos que el archivo exista
if [ ! -f "$archivo_jugadores" ]; then
  echo "❌ No se encontró el archivo de jugadores: $archivo_jugadores"
  exit 1
fi

# Iteramos sobre cada nombre
while IFS= read -r jugador || [ -n "$jugador" ]; do
  # Normalizamos el nombre para carpeta (sin espacios, todo minúscula)
  carpeta=$(echo "$jugador" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')

  # Creamos carpeta del jugador
  mkdir -p "data/jugadores/$carpeta"

  # Archivos base
  touch "data/jugadores/$carpeta/reputacion.txt"
  touch "data/jugadores/$carpeta/historial.txt"
  touch "data/jugadores/$carpeta/penalidades.txt"

  # Mensaje en el log
  echo "[$(date)] Jugador creado: $jugador → carpeta: $carpeta" >> data/logs/torneo.log
done < "$archivo_jugadores"

echo "✅ Todos los jugadores fueron creados correctamente."