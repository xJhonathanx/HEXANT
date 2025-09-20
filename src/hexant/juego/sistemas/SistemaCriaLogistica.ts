import type { World } from '../../tipos';
import { HATCH_TIME } from '../configuracion/predeterminados';

export function SistemaCriaLogistica(w:World){
  const m = w.meta; if (!m?.broodTransferPending) return;
  const targetId = m.broodTargetHexId ?? null; if (!targetId) return;

  const target = w.hexes.find(h=>h.id===targetId);
  if (!target){ m.broodTransferPending=false; return; }
  if (!target.completed) return; // esperar fin de obra

  const move = Math.min(6, m.broodEggsStaged ?? 0);
  if (move <= 0){ m.broodTransferPending=false; return; }

  target.eggs = { count: move, fed: 0, hatchTicks: HATCH_TIME, active: true };
  m.broodEggsStaged      = (m.broodEggsStaged ?? 0) - move;
  m.broodTransferPending = false;
}
