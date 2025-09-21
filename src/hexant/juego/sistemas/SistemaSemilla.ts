import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

/** Crea 1 constructora y 3 obreras si faltan. Solo una vez por MUNDO. */
export function SistemaSemilla(w:World, _cfg:Cfg){
  // Evita usar variables de módulo (HMR puede preservarlas). Usa el mundo.
  if ((w as any)._seeded) return;

  const q = w.hexes.find(h => (h as any).host === "queen");
  if (!q) return;

  const mk = (kind:"worker"|"builder") => w.ants.push({
    id: w.nextAntId++,
    kind,
    x: q.cx, y: q.cy, vx:0, vy:0,
    carryingUnits: 0,
    state: "foraging",
    homeHexId: q.id,
  } as any);

  if (!w.ants.some(a => a.kind === "builder")) mk("builder");

  const haveWorkers = w.ants.filter(a => a.kind === "worker").length;
  for (let i = haveWorkers; i < 3; i++) mk("worker");

  (w as any)._seeded = true;
}
