/**
 * azar.ts  RNG con semilla (Mulberry32). Útil para reproducibilidad.
 */
export type RNG = () => number;

export function createRNG(seed:number): RNG {
  let t = seed >>> 0;
  return function() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function randfSeeded(rng:RNG, a:number, b:number){ return a + rng()*(b-a); }
export function choice<T>(rng:RNG, arr: T[]): T { return arr[Math.floor(rng()*arr.length)]; }
