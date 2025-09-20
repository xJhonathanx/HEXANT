/** SistemaMetabolismo  Lote D: hambre que sube lentamente (sin muertes aún). */
import { World } from "../../tipos";
import { CONSUME_PER_TICK } from "../configuracion/predeterminados";

export function SistemaMetabolismo(w:World, dt:number){
  const perTick = CONSUME_PER_TICK; // ya viene en und/tick(60hz)
  for(const a of w.ants){
    if (a.state === "dead") continue;
    a.hungerUnd += perTick;
  }
}
