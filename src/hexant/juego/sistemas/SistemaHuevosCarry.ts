import type { World } from "../../tipos";

/** Hace que los huevos en state="carried" sigan al carrier (nurse) para coherencia visual/lógica. */
export function SistemaHuevosCarry(w:World){
  const eggs:any[] = (w as any).eggs ?? [];
  if (!eggs.length) return;

  for (const e of eggs){
    if (e.state !== "carried") continue;
    const id = (e as any).carrierId;
    if (id == null) continue;
    const a = w.ants.find(x => (x as any).id === id);
    if (!a) { (e as any).carrierId = null; e.state = "atQueen"; continue; }
    // seguidito, con un pequeño offset para que se vea "en mano"
    (e as any).x = a.x + 2.5;
    (e as any).y = a.y - 2.5;
  }
}
