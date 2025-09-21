import type { World } from "../../tipos";

const SPEED = 0.9;          // velocidad de la constructora
const DAMP  = 0.86;         // amortiguación
const BUILD_RATE = 0.08;    // unidades por tick construyendo

export function SistemaBuilder(w: World){
  const b = w.ants.find(a => a.kind === "builder");
  if (!b) return;

  const targetId = w.meta?.broodTargetHexId ?? null;
  if (!targetId) return;

  const h = w.hexes.find(x => (x as any).id === targetId);
  if (!h || (h as any).completed) return;

  // moverse hacia el centro del hex objetivo
  const dx = (h as any).cx - b.x;
  const dy = (h as any).cy - b.y;
  const d2 = dx*dx + dy*dy;
  const d  = Math.sqrt(d2) || 1;

  b.vx = b.vx * DAMP + (dx / d) * SPEED;
  b.vy = b.vy * DAMP + (dy / d) * SPEED;
  b.x += b.vx; b.y += b.vy;

  // martillar si ya está encima
  const near = d < ((h as any).sidePx ?? 24) * 0.7;
  if (near){
    (h as any).builtUnits = ((h as any).builtUnits ?? 0) + BUILD_RATE;
    const goal = (h as any).targetUnits ?? 6;
    if ((h as any).builtUnits >= goal){
      (h as any).completed = true;
      if (w.meta) w.meta.buildCooldownTicks = 90; // respiro antes de otro plan
    }
  }
}
