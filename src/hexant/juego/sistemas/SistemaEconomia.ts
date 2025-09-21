import type { World } from "../../tipos";

/** Al tocar la reina, las hormigas depositan sus carryingUnits al banco (w.stockFood). */
export function SistemaEconomia(w:World){
  const q = w.hexes.find(h=>h.host==="queen");
  if (!q) return;
  w.stockFood = w.stockFood ?? 0;

  for (const a of w.ants){
    if (!a.carryingUnits || a.carryingUnits <= 0) continue;
    const dx = a.x - q.cx, dy = a.y - q.cy;
    if (dx*dx + dy*dy <= (q.sidePx*q.sidePx)*0.3){
      w.stockFood += a.carryingUnits;
      a.carryingUnits = 0;
      a.state = "foraging";
    }
  }
}
