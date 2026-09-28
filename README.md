# HEXANT  Milestone

- 1 builder + 3 workers iniciales  
- Obreras cargan **7 und** por viaje, comida por defecto **25 und**  
- Banco (stockFood) sube al depositar; HUD muestra Banco y Huevos  
- Reina: glow; pone 1 huevo c/ ~30 ticks, tope 6; cada huevo cuesta **25** und  
- Logística: al llegar a 6 huevos se planifica hex y la constructora traslada huevos  
- Scout + Kel: orbitas con cola de cometa, umbilical visible fuera del domo  
- Grilla hex centrada y alineada al tamaño de panales


## Natal visible y navegable (HEXANT-GAMEPLAY-01)

- Al iniciar, la cámara queda centrada en el hex natal (reina); hay un único hex natal.
- **Mover:** WASD / flechas (Shift ×2, Alt ×0.5) o arrastrar con clic izquierdo/central
- **Zoom:** rueda (con o sin Ctrl) o `+` / `-`, anclado al cursor
- **Volver al natal:** `H` o `Inicio`
- **Minimapa:** clic o arrastre para saltar; muestra natal, AIR, hexes, rastro del scout y el viewport
- Si el natal queda fuera de pantalla, una flecha en el borde apunta hacia él
- La cámara no se aleja más de `max(1200 px, 4 × radio del AIR)` del natal
