import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

import { SistemaSemilla } from "./SistemaSemilla";
import { SistemaReina } from "./SistemaReina";
import { SistemaPlanificacion } from "./SistemaPlanificacion";

// Opcionales (si existen en tu árbol)
import { SistemaIA } from "./SistemaIA";
import { SistemaCria } from "./SistemaCria";
import { SistemaCriaLogistica } from "./SistemaCriaLogistica";
import { SistemaMetabolismo } from "./SistemaMetabolismo";

export function ejecutarSistemas(w:World, cfg:Cfg){
  (w as any)._tick = ((w as any)._tick ?? 0) + 1;

  // 0) Asegura el sembrado inicial: 1 builder + 3 workers
  SistemaSemilla(w, cfg);

  // 1) Metabolismo (si lo tienes con firma (w,cfg))
  if (typeof SistemaMetabolismo === "function") SistemaMetabolismo(w, cfg);

  // 2) Reina (postura solo con comida y tope 6)
  SistemaReina(w, cfg);

  // 3) Logística de cría (traslado de huevos)
  if (typeof SistemaCriaLogistica === "function") SistemaCriaLogistica(w);

  // 4) Incubación / eclosión
  if (typeof SistemaCria === "function") SistemaCria(w, cfg);

  // 5) IA / forrajeo / builder
  if (typeof SistemaIA === "function") SistemaIA(w, cfg);

  // 6) Planificación de nuevo hex SOLO con 6 huevos y builder vivo
  const m:any = w.meta;
  if (m && m.broodEggsStaged >= 6 && !m.broodTransferPending && w.ants.some(a => a.kind === "builder")){
    SistemaPlanificacion(w, cfg);
  }
}
