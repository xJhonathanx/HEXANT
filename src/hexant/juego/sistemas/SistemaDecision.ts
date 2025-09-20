/** SistemaDecision  Lote D: asegura estados base. */
import { World } from "../../tipos";
export function SistemaDecision(w:World, _dt:number){
  for(const a of w.ants){
    if (a.state === "waiting") a.state = "foraging";
    if (a.state === "dead") continue;
  }
}
