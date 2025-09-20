import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";
import { workerBrain, builderBrain } from "../inteligencia/cerebros/Cerebros";

export function SistemaIA(w:World, _cfg:Cfg){
  for (const a of w.ants){
    if (a.kind === "worker")  workerBrain(w, a);
    else if (a.kind === "builder") builderBrain(w, a);
  }
}
