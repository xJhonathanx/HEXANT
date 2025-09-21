import type { World } from "../../tipos";
import type { Cfg } from "../configuracion/predeterminados";

/** Metabolismo básico: las hormigas consumen y, si hay stock, se alimentan. */
export function SistemaMetabolismo(w: World, cfg: Cfg){
  // usa la config si existe; si no, un valor seguro por defecto
  const perTick = (cfg as any)?.metabolismUndPerTick ?? 0.02;

  for (const a of w.ants){
    a.hungerUnd = (a.hungerUnd ?? 0) + perTick;

    // si hay comida en almacén, se alimenta y reduce hambre
    const stock = (w as any).stockFood ?? 0;
    if (a.hungerUnd! > 0 && stock > 0){
      const feed = Math.min(a.hungerUnd!, stock);
      a.hungerUnd! -= feed;
      (w as any).stockFood = stock - feed;
    }

    // contaje de inanición (defensivo, por si algún ant no trae estas props)
    a.starveTicks = (a.hungerUnd! > 5) ? ((a.starveTicks ?? 0) + 1) : 0;
  }
}
