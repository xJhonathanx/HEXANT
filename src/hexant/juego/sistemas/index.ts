import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";
import { SistemaSemilla } from "./SistemaSemilla";
import { SistemaReina } from "./SistemaReina";
import { SistemaPlanificacion } from "./SistemaPlanificacion";
import { SistemaIA } from "./SistemaIA";

export function ejecutarSistemas(w:World, cfg:Cfg){
  (w as any)._tick = ((w as any)._tick ?? 0) + 1;

  SistemaSemilla(w, cfg);
  SistemaReina(w, cfg);
  if (typeof SistemaIA === "function") SistemaIA(w, cfg);

  // Disparar planificación cuando haya 6 huevos listos
  const m = w.meta as any;
  if (m && m.broodEggsStaged >= 6 && !m.broodTransferPending && w.ants.some(a=>a.kind==="builder")){
    SistemaPlanificacion(w, cfg);
  }
}
