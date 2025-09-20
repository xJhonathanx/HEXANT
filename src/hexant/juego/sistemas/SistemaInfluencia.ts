/** SistemaInfluencia  aplica correa suave alrededor de la reina. */
import { World } from "../../tipos";
import { INFLUENCE_BASE_PX, INFLUENCE_PER_HEX_PX } from "../configuracion/predeterminados";

function radioInfluencia(w:World){
  const nonQueen = w.hexes.filter(h => h.host !== "queen").length;
  return INFLUENCE_BASE_PX + nonQueen * INFLUENCE_PER_HEX_PX;
}

export function SistemaInfluencia(w:World, _dt:number){
  const q = w.hexes.find(h => h.host === "queen");
  if (!q) return;
  const R = radioInfluencia(w);

  for(const a of w.ants){
    if (a.state === "dead") continue;
    const dx = a.x - q.cx, dy = a.y - q.cy;
    const d  = Math.hypot(dx, dy) || 1;
    if (d > R){
      const over = (d - R) / R;                 // cuánto excede
      const pull = 0.08 + 0.22 * Math.min(1, over);
      a.vx -= (dx / d) * pull;
      a.vy -= (dy / d) * pull;
    }
  }
}
