import { Graphics } from "pixi.js";
import type { Ant } from "../../tipos";

/** Dibuja una hormiga según su tipo. Añade aro si lleva carga. */
export function drawAnt(g: Graphics, a: Ant ) {
  g.clear();
  const kind = (a as any).kind as string;
  const carrying = (a as any).carryingUnits ?? 0;

  // radio por tipo (worker ~3  nurse = 1.5)
  const r =
    kind === "soldier" ? 5 :
    kind === "builder" ? 4 :
    kind === "nurse"   ? 1.5 : 3;

  // color por tipo
  let color = 0x4da3ff; // worker
  if (kind === "builder") color = 0xd84b20;
  if (kind === "soldier") color = 0xff4d4f;
  if (kind === "nurse")   color = 0xffffff;  // blanco
  if (kind === "scout")   color = 0x00d1ff;
  if (kind === "kel")     color = 0xffffff;

  // pequeña "cola" cuando se mueve (solo obreras)
  if (kind === "worker") {
    const vx = (a as any).vx ?? 0;
    const vy = (a as any).vy ?? 0;
    const sp = Math.hypot(vx, vy);
    if (sp > 0.2) {
      const L = Math.min(8, 4 + sp * 3);      // longitud 4..8 px
      const tx = - (vx / (sp || 1)) * L;
      const ty = - (vy / (sp || 1)) * L;
      g.moveTo(0, 0).lineTo(tx, ty).stroke({ width: 1.5, color: 0x4da3ff, alpha: 0.85 });
      // ligera estela punteada
      g.circle(tx * 0.6, ty * 0.6, 0.9).fill(0x4da3ff, 0.6);
    }
  }

    // pequeña "cola" cuando se mueve (solo builder)
  // cola "cometa" (builder)
if (kind === "builder") {
  const vx = (a as any).vx ?? 0;
  const vy = (a as any).vy ?? 0;
  const sp = Math.hypot(vx, vy);
  if (sp > 0.12) {
    // dirección opuesta al movimiento (hacia atrás)
    const ux = -(vx / (sp || 1));
    const uy = -(vy / (sp || 1));

    // === tamaño de la cola ===
    const L = Math.min(26, 10 + sp * 5);     // longitud 10..26 px  ← agrándala aquí
    const W = Math.min(10, r * 2.6);          // ancho en la base    ← y aquí

    // normal perpendicular para el ancho
    const nx = -uy, ny = ux;

    // punta (atrás) y base (alrededor del cuerpo)
    const px = ux * L,   py = uy * L;
    const bx1 =  nx * W * 0.5, by1 =  ny * W * 0.5;
    const bx2 = -nx * W * 0.5, by2 = -ny * W * 0.5;

    // capa suave exterior
    g.moveTo(px, py)
     .lineTo(bx1, by1)
     .lineTo(bx2, by2)
     .closePath()
     .fill(0xd84b20, 0.25);

    // núcleo brillante interior
    g.moveTo(px * 0.7, py * 0.7)
     .lineTo(bx1 * 0.7, by1 * 0.7)
     .lineTo(bx2 * 0.7, by2 * 0.7)
     .closePath()
     .fill(0xd84b20, 0.55);

    // trazo central (da sensación de “chorro”)
    g.moveTo(0, 0).lineTo(px, py).stroke({ width: 1.6, color: 0xd84b20, alpha: 0.85 });
  }
}
//---------------------------------------------------------------------

  // cuerpo
  g.circle(0, 0, r).fill(color, 1);

  // halo nurse (glow). En latencia pulsea con (a.pulse)
  if (kind === "nurse") {
    const alpha = (a as any).pulse ?? 0.9;
    g.circle(0, 0, r + 3).stroke({ width: 2, color: 0xffffff, alpha });
  }

  // aro si lleva COMIDA
  if (carrying > 0) {
    g.circle(0, 0, r + 1).stroke({ width: 1, color: 0xbdfcc9, alpha: 0.95 });
  }

  // punto naranja si la nurse lleva HUEVO (state: "carried")
  if (kind === "nurse" && ((a as any).carryEggId != null || (a as any).carryEgg === true)) {
    g.circle(r*0.9, -r*0.9, 2.4).fill(0xffc14a, 0.98).stroke({ width: 1, color: 0xff9f2a, alpha: 0.95 });
  }
}


