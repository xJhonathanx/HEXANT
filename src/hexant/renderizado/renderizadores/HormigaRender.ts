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
  let color = 0x59f79b; // worker
  if (kind === "builder") color = 0xffc857;
  if (kind === "soldier") color = 0xff4d4f;
  if (kind === "nurse")   color = 0xffffff;  // blanco
  if (kind === "scout")   color = 0x00d1ff;
  if (kind === "kel")     color = 0xffffff;

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


