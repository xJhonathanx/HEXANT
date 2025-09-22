/* ===== Influencia de la reina ===== */
export const INFLUENCE_BASE_PX    = 220;
export const INFLUENCE_PER_HEX_PX = 28;

/* ================= Reloj base ================= */
export const TICKS_PER_SEC = 60;
export const TICKS_PER_MIN = 60 * TICKS_PER_SEC;

/* ============== Metabolismo / hambre ============== */
export const CONSUME_PER_TICK = 5 / TICKS_PER_MIN;
export const STARVE_OUTSIDE  = 3 * TICKS_PER_MIN;
export const STARVE_INSIDE   = 5 * TICKS_PER_MIN;

/* =================== Cría (huevos) =================== */
export const HATCH_TIME    = 45 * TICKS_PER_SEC; // 45 s de incubación
export const EGGS_NEED_UND = 25;                // 100 und de comida para el lote
export const EGGS_TTL_TICKS = 5 * TICKS_PER_MIN; // 5 minutos sin alimentar  desaparecen

/* ================= Viajes / carga ================= */
export const CARRY_PER_TRIP = 7;

/* ============== Olfato / feromonas ============== */
export const SMELL_RADIUS          = 100;
export const SMELL_RADIUS_MIN      = 60;
export const SMELL_RADIUS_PER_UNIT = 1.0;

/* =================== Límites =================== */
export const MAX_BEACONS   = 160;
export const MAX_CORPSES   = 400;
export const HEX_STOCK_CAP = 50;

/* =================== TTL feromonas =================== */
export const BEACON_TTL_FOOD = 5 * TICKS_PER_SEC;
export const BEACON_TTL_HELP = 12 * TICKS_PER_SEC;

/* =================== Hazard =================== */
export const HAZARD_MAX_SPEED     = 0.65;
export const HAZARD_SUCK_PER_TICK = 0.9;

/* ============== Spawns aleatorios ============== */
export const FOOD_AUTO_MIN_SEC   = 12;
export const FOOD_AUTO_MAX_SEC   = 28;
export const HAZARD_AUTO_MIN_SEC = 12;
export const HAZARD_AUTO_MAX_SEC = 24;

/* ============== Construcción (referencias) ============== */
export const PIXELS_PER_UNIT     = 10;
export const HEX_UNITS_WORKER_10 = 60;

/* ======================================================= */
export type Cfg = {
  initialWorkers: number; initialBuilder: boolean;
  workerCost: number; builderCost: number;
  moveDistanceUnitPx: number; moveCostPctPerUnit: number; maxSpeed: number; paralysisTicks: number; helpTransferMaxPct: number; unitToEnergyPct: number;
  baseCommRadiusPx: number; commRadiusMaxPx: number;
  pixelsPerUnit: number; hexUnitsFor10: number; workerHexVisualScale: number;
};

export const defaultCfg: Cfg = {
  initialWorkers: 3, initialBuilder: true,
  workerCost: 10, builderCost: 10,
  moveDistanceUnitPx: 100, moveCostPctPerUnit: 0.5, maxSpeed: 1.8, paralysisTicks: 300, helpTransferMaxPct: 60, unitToEnergyPct: 0.5,
  baseCommRadiusPx: 36, commRadiusMaxPx: 220,
  pixelsPerUnit: 10, hexUnitsFor10: 60, workerHexVisualScale: 0.75,
};

export const EGG_COST_FOOD = 2;

export const FOOD_DROP_UNITS = 25;
export const PICKUP_RADIUS = 10;   // px para recoger
export const DROP_RADIUS   = 12;   // px para depositar
export const SEEK_K        = 0.06; // "atracción" por tick
export const MAX_SPEED     = 1.8;  // px/tick máximo


export const DEFAULT_FOOD_DROP = 25;


//
// === Reina: costos y ritmo (exports nombrados) ===
export const EGG_COST = 25;        // 25 und por huevo
export const EGG_LAY_PERIOD = 30;  // 30 ticks por huevo
export const MAX_EGGS_AT_QUEEN = 6;// tope de huevos renderizados en la reina



