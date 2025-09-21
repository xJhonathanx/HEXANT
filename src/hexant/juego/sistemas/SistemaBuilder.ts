import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

const BUILD_COST_DEFAULT = 100;
const BUILD_RATE_PER_TICK = 2; // cuántas und del coste se construye por tick

export function SistemaBuilder(w: World, _cfg: Cfg) {
  const m: any = (w as any).meta;
  if (!m?.buildTargetHexId) return;

  const h = w.hexes.find(x => x.id === m.buildTargetHexId) as any;
  if (!h) { m.buildTargetHexId = null; return; }
  if (h.completed) { m.buildTargetHexId = null; return; }

  const bank = (w as any).stockFood ?? 0;
  if (bank <= 0) return;

  const target = h.targetUnits ?? BUILD_COST_DEFAULT;
  const built = h.builtUnits ?? 0;
  const need  = Math.max(0, target - built);
  if (need <= 0) { h.completed = true; m.buildTargetHexId = null; return; }

  const step = Math.min(BUILD_RATE_PER_TICK, need, bank);
  h.builtUnits = built + step;
  (w as any).stockFood = bank - step;

  if (h.builtUnits >= target) {
    h.completed = true;
    m.buildTargetHexId = null;
  }
}
