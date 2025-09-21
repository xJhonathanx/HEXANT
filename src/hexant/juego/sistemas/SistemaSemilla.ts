import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

/** Crea 1 builder y 3 workers solo una vez por mundo. */
export function SistemaSemilla(w:World, _cfg:Cfg){
  // Asegura meta con los campos que usa el resto del juego
  (w as any).meta = (w as any).meta ?? {
    broodTargetHexId: null,
    broodEggsStaged: 0,
    broodTransferPending: false,
    buildCooldownTicks: 0,
  };
  const meta:any = (w as any).meta;

  // Si ya sembramos, no repetir
  if (meta.__seeded) return;

  // Necesitamos el hex de la reina para posicionar el spawn
  const q = w.hexes.find(h => h.host === "queen");
  if (!q) return;

  const makeAnt = (kind:"worker"|"builder") => {
    w.ants.push({
      id: w.nextAntId++,
      kind,
      x: q.cx, y: q.cy,
      vx: 0, vy: 0,
      state: "idle",
      carryingUnits: 0,
      homeHexId: q.id,
      hungerUnd: 0,
    } as any);
  };

  // Al menos 1 constructora
  if (!w.ants.some(a => a.kind === "builder")) makeAnt("builder");

  // Completa hasta 3 obreras
  const existingWorkers = w.ants.filter(a => a.kind === "worker").length;
  for (let i = existingWorkers; i < 3; i++) makeAnt("worker");

  meta.__seeded = true;
}
