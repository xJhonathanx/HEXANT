import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

let seeded = false;

/** Crea 1 builder, 3 workers y 1 nurse si faltan. Solo una vez por sesión. */
export function SistemaSemilla(w:World, _cfg:Cfg){
  if (seeded) return;
  const q = w.hexes.find(h=> (h as any).host==="queen") as any;
  if (!q) return;

  const mk = (kind:"worker"|"builder"|"nurse") => {
    const a:any = {
      id: w.nextAntId++,
      kind,
      x: q.cx, y: q.cy, vx:0, vy:0,
      carryingUnits: 0,
      state: kind==="builder" ? "building" : "foraging",
      homeHexId: q.id,
    };
    if (kind==="worker") a.spawnSlot = (w.ants.filter(z=>z.kind==="worker").length) % 6;
    w.ants.push(a);
  };

  if (!w.ants.some(a=>a.kind==="builder")) mk("builder");
  const workers = w.ants.filter(a=>a.kind==="worker").length;
  for (let i=workers; i<3; i++) mk("worker");
  if (!w.ants.some(a => (a as any).kind === "nurse")) mk("nurse" as any);

  seeded = true;
}
