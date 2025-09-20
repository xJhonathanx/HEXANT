/** SistemaAccionMover  integra posición y limita velocidad. */
import type { World } from "../../tipos";

export function SistemaAccionMover(w:World, _dt:number, maxSpeed:number){
  for (const a of w.ants){
    if (a.state === "dead") continue;

    // fricción suave
    a.vx *= 0.995;
    a.vy *= 0.995;

    // tope de velocidad
    const sp = Math.hypot(a.vx, a.vy);
    if (sp > maxSpeed){
      a.vx = (a.vx / sp) * maxSpeed;
      a.vy = (a.vy / sp) * maxSpeed;
    }

    // integrar
    a.x += a.vx;
    a.y += a.vy;
  }
}
