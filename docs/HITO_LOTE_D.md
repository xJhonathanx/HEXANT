# HEXANTV1 – Contexto (Hito Lote D)
- Stack: Vite + TypeScript + Pixi v8.
- Entrada: click derecho = comida 50 und (o 10 si así está), Shift = patrón, Ctrl = peligro.
- IA:
  * 3 obreras + 1 constructora (SistemaSemilla).
  * Obreras: 5 und por viaje, depositan en reina, idle orbitan su home-hex.
  * Constructora: recoge huevos de la reina (se le “pega” huevo), los coloca en spots interiores del hex objetivo; al tener 6, se activa nido (alimentación/nacimiento).
- Planificación: puede expandir más allá del primer anillo; elige base aleatoria entre hexes existentes.
- Render: huevos colocados se ven como puntos naranjas dentro del hex; la constructora con huevo muestra un puntito naranja pegado.
- TODO próximos lotes (E → …): refinamiento de alimentación/tiempos, soldados/hazard AI, balance y UI.
