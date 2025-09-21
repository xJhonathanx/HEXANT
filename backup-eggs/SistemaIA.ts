import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";
import { workerBrain, builderBrain } from "../inteligencia/cerebros/Cerebros";

export function SistemaIA(w: World, _cfg: Cfg) {
  const q = w.hexes.find(h => h.host === "queen");
  const cx = q?.cx ?? 0;
  const cy = q?.cy ?? 0;
  const anyFood = w.food.find(f => f.amount > 0);

  for (const a of w.ants) {
    if (a.kind === "worker")      workerBrain(w, a);
    else if (a.kind === "builder")builderBrain(w, a, cx, cy);
  }
}



