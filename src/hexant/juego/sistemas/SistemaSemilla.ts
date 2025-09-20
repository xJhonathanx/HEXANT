import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

/** Crea 1 builder y 3 workers si faltan. Solo una vez por mundo. */
export function SistemaSemilla(w:World, _cfg:Cfg){
  if ((w as any).__seeded) return;

  const q = w.hexes.find(h=>h.host==="queen");
  if (!q) return;

  const mk = (kind:"worker"|"builder") => w.ants.push({
    id: w.nextAntId++,
    kind,
    x: q.cx, y: q.cy, vx:0, vy:0,
    carryingUnits: 0,
    state: "foraging",
    homeHexId: q.id,
  } as any);

  if (!w.ants.some(a=>a.kind==="builder")) mk("builder");
  const workers = w.ants.filter(a=>a.kind==="worker").length;
  for (let i=workers; i<3; i++) mk("worker");

  (w as any).__seeded = true;
}
