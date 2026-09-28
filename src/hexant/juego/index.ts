import { World, Hex, Ant, AntKind } from "../tipos";
import { Cfg } from "./configuracion/predeterminados";
import { randf } from "../utilidades/matematica";
import { axialToPixelPT } from "../utilidades/hex";



/** Vecinos en axial (pointy-top) */
const DIRS: Array<[number, number]> = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
];

/** Crea el mundo vacío y poblado mínimamente. */
export function crearMundoInicial(W:number, H:number): World {
  return { eggs: [], nextEggId: 1,
    ants: [], food: [], hazards: [], corpses: [], beacons: [],
    looseDecos: [], nextDecoId: 1,
    stockFood: 0, stockTotal: 0,
    hexes: [], nextHexId: 1,
    spawnCooldown: 0, nextAntId: 1, noFoodTicks: 0,
    camera: { x: 0, y: 0, scale: 1 },
    ui: { influenceFlashTicks: 0 },
    _tick: 0,
  };
}

/** Bootstrap: crea el hex natal (reina), una semilla de comida y hormigas iniciales. */
export function bootstrapWorld(w: World, cfg: Cfg, cx: number, cy: number) {
  // Natal: un único hex de reina (si ya existe se reutiliza, nunca se duplica)
  let queenHex = w.hexes.find(h => h.host === "queen");
  if (!queenHex) {
    queenHex = {
      id: w.nextHexId++,
      cx, cy,
      sidePx: 36,
      targetUnits: 0, builtUnits: 0,
      host: "queen",
      capacity: 999, occupancy: 0,
      completed: true,
      stockUnd: 0,
      eggs: undefined,
      decos: [],
      aq: 0, ar: 0, connections: 0,
    };
    w.hexes.push(queenHex);
  }
  const S = queenHex.sidePx;
  const qx = queenHex.cx, qy = queenHex.cy;

  // Semilla de comida (para arrancar)
  const seed = 80;
  w.food.push({ x: qx + S * 1.2, y: qy, amount: seed, initial: seed });

  // Hormigas iniciales sobre la reina
  if (cfg.initialBuilder) w.ants.push(newAnt(qx, qy, "builder", w, queenHex.id));
  for (let i = 0; i < Math.max(0, cfg.initialWorkers); i++) {
    w.ants.push(newAnt(qx, qy, "worker", w, queenHex.id));
  }
}

export function newAnt(
  x: number, y: number, kind: AntKind, world: World, homeHexId: number | null
): Ant {
  return {
    id: world.nextAntId++,
    kind,
    x, y,
    vx: randf(-0.3, 0.3),
    vy: randf(-0.3, 0.3),
    state: kind === "builder" ? "building" : "foraging",
    ageTicks: 0,
    homeHexId,
    hungerUnd: 0,
    starveTicks: 0,
    carryingUnits: 0,
    carryingDecoId: null,
    lastFoodPos: null,
    attackCd: 0,
    energyPct: 100,
    totalDistPx: 0,
    waitTicks: 0,
    targetHexId: null,
  };
}

/** Planificación vecina (stub mínimo para Lote D; se ampliará en Lote E/F) */
export function axialVecinoRandom(aq:number, ar:number){
  const d = DIRS[(Math.random()*6)|0];
  return { q: aq + d[0], r: ar + d[1] };
}

export function axialToPixelRel(q:number, r:number, side:number){
  return axialToPixelPT(q, r, side);
}
export { SistemaPlanificacion } from "./sistemas/SistemaPlanificacion";



