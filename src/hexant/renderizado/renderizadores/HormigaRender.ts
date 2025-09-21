import { Graphics } from "pixi.js";
import type { Ant } from "../../tipos";

/** Dibuja una hormiga según su tipo. Añade aro si lleva carga. */
export function drawAnt(g: Graphics, a: Ant) {
  g.clear();
  const kind = (a as any).kind as string;
  const carrying = (a as any).carryingUnits ?? 0;

  // radio por tipo
  const r =
    kind === "soldier" ? 5 :
    kind === "builder" ? 4 :
    kind === "nurse"   ? 3.5 : 3; // worker y otros

  // color por tipo
  let color = 0x59f79b; // worker
  if (kind === "builder") color = 0xffc857;
  if (kind === "soldier") color = 0xff4d4f;
  if (kind === "nurse")   color = 0xb388ff;
  if (kind === "scout")   color = 0x00d1ff;
  if (kind === "kel")     color = 0xffffff;

  g.circle(0, 0, r).fill(color, 1);

  if (carrying > 0) {
    g.circle(0, 0, r + 1).stroke({ width: 1, color: 0xbdfcc9, alpha: 0.95 });
  }
}
