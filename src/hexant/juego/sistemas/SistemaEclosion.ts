import type { World } from "../../tipos";
import { EGGS_NEED_UND, HATCH_TIME } from "../configuracion/predeterminados";
import { newAnt } from "../index";

export function SistemaEclosion(w: World, _cfg?: unknown){
  (w as any).eggs = (w as any).eggs ?? [];
  const eggs:any[] = (w as any).eggs;

  const hexCompletados = w.hexes.filter(h => h.host !== "queen" && (h as any).completed).length;
  const nurses = w.ants.filter(a => (a as any).kind === "nurse").length;

  for (let i = eggs.length - 1; i >= 0; i--){
    const e = eggs[i];
    if (e.state !== "incubating") continue;
    if ((e.fed ?? 0) < EGGS_NEED_UND) continue;

    if (e.hatchTicks == null) e.hatchTicks = HATCH_TIME;
    if (e.hatchTicks > 0) e.hatchTicks -= 1;

    if (e.hatchTicks <= 0){
      const hex = w.hexes.find(h => (h as any).id === (e as any).hexId) as any;
      const cx = e.x ?? hex?.cx ?? 0;
      const cy = e.y ?? hex?.cy ?? 0;
      const homeId = hex?.id ?? null;

      const needAnotherNurse = (nurses*4) < hexCompletados;
      const kind = needAnotherNurse ? ("nurse" as any) : ("worker" as any);

      const ant:any = newAnt(cx, cy, kind, w, homeId);
      if (kind === "worker") ant.spawnSlot = (w.ants.filter(a=>a.kind==="worker").length) % 6;

      w.ants.push(ant);

      //  marcar nido como ocupado
      if (hex) hex.occupancy = (hex.occupancy ?? 0) + 1;

      eggs.splice(i, 1);
    }
  }
}
