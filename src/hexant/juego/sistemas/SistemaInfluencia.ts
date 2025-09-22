import { World } from "../../tipos";

export function SistemaInfluencia(w:World, _dt:number){
  const q = w.hexes.find(h => h.host === "queen");
  if (!q) return;

  // radio base (una sola vez): coincide con el domo visual por defecto
  const M:any = (w as any).meta = (w as any).meta ?? {};
  if (M.AIR_R0 == null) M.AIR_R0 = (q as any).sidePx * 6;

  const N = w.hexes.filter(h => h.host !== "queen").length;
  const R0 = M.AIR_R0 as number;
  const R  = R0 + N * (0.25 * 2 * R0); // = R0 * (1 + 0.5*N)

  // expone para el render del domo
  (w as any).domeRadius = R;

  // correa de atracción con ese mismo radio
  for(const a of w.ants){
    if (a.state === "dead") continue;
    const dx = a.x - q.cx, dy = a.y - q.cy;
    const d  = Math.hypot(dx, dy) || 1;
    if (d > R){
      const over = (d - R) / R;
      const pull = 0.08 + 0.22 * Math.min(1, over);
      a.vx -= (dx / d) * pull;
      a.vy -= (dy / d) * pull;
    }
  }
}
