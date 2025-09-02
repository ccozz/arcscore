#!/bin/bash

# Verificamos argumentos
if [ "$#" -lt 3 ]; then
  echo "❌ Uso: bash registrar_evento.sh <jugador> <tipo_evento> <valor>"
  echo "Ejemplo: bash registrar_evento.sh cri gol 1"
  exit 1
fi

jugador_raw="$1"
evento="$2"
valor="$3"

# Normalizamos nombre
jugador=$(echo "$jugador_raw" | tr '[:upper:]' '[:lower:]' | tr ' ' '_')
carpeta="data/jugadores/$jugador"

# Verificamos que el jugador exista
if [ ! -d "$carpeta" ]; then
  echo "❌ Jugador '$jugador_raw' no encontrado."
  exit 1
fi

# Actualizamos historial
echo "[$(date)] Evento: $evento | Valor: $valor" >> "$carpeta/historial.txt"

# Actualizamos reputación (suma o resta según tipo)
case "$evento" in
  gol|asistencia)
    puntos=$valor
    ;;
  falta|penalidad)
    puntos=$(( -1 * valor ))
    ;;
  *)
    echo "⚠️ Tipo de evento desconocido: $evento. No se modifica reputación."
    puntos=0
    ;;
esac

# Si hay puntos que modificar
if [ "$puntos" -ne 0 ]; then
  reputacion_actual=$(cat "$carpeta/reputacion.txt" 2>/dev/null || echo 0)
  reputacion_nueva=$(( reputacion_actual + puntos ))
  echo "$reputacion_nueva" > "$carpeta/reputacion.txt"
fi

# Log general
echo "[$(date)] Evento registrado: $jugador_raw → $evento ($valor)" >> data/logs/torneo.log

echo "✅ Evento registrado para $jugador_raw. Reputación actualizada: $reputacion_nueva"