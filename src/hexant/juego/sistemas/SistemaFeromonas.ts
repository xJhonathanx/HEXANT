import type { World } from '../../tipos';
import { MAX_BEACONS, BEACON_TTL_FOOD } from '../configuracion/predeterminados';

export function SistemaFeromonas(w:World){
  const t = (w as any)._tick ?? 0;

  // Decaimiento suave
  if ((t % 4) === 0){
    for (let i=w.beacons.length-1; i>=0; i--){
      const b = w.beacons[i];
      b.strength *= b.decay ?? 0.97;
      b.ttl = (b.ttl ?? BEACON_TTL_FOOD) - 4;
      if (b.strength < 0.05 || b.ttl <= 0) w.beacons.splice(i,1);
    }
  }

  // Limitar cantidad
  if (w.beacons.length > MAX_BEACONS){
    w.beacons.splice(0, w.beacons.length - MAX_BEACONS);
  }

  // Emisión pasiva desde nodos de comida
  if ((t % 30) === 0){
    for (const f of w.food){
      if (f.amount <= 0) continue;
      const s = Math.min(1, f.amount / 50);
      w.beacons.push({ x:f.x, y:f.y, strength: 0.5*s, decay: 0.97, ttl: BEACON_TTL_FOOD });
    }
  }
}
