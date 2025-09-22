import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";
import { workerBrain, builderBrain, nurseBrain } from "../inteligencia/cerebros/Cerebros";

export function SistemaIA(w: World, _cfg: Cfg){
  // centro de referencia: la reina si existe
  const q = w.hexes.find(h => (h as any).host === "queen") as any;
  const cx = q?.cx ?? 0;
  const cy = q?.cy ?? 0;

  // pista de comida para workerBrain (hint opcional)
  const anyFood = w.food.find(f => (f as any).amount > 0);

  for (const a of (w.ants as any[])) {
    if (a.kind === "worker")      workerBrain(w, a);
    else if (a.kind === "builder")builderBrain(w, a);
    else if (a.kind === "nurse")  nurseBrain(w, a);
    // soldiers, scout, kel, etc. se manejan en sus sistemas específicos
  }
}


