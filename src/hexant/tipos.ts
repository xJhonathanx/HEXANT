export type AntState = "foraging" | "returning" | "waiting" | "building" | "nesting" | "dead";
export type AntKind  = "worker" | "soldier" | "builder";
export type HostKind = "worker" | "builder" | "soldier" | "queen";

export type Camera = { x:number; y:number; scale:number };
export type UIState = { influenceFlashTicks:number };

/** Solo líneas, círculos y etiquetas (letras). */
export type Decoration = {
  id: number;
  kind: "line" | "circle" | "label";
  x: number; y: number;
  size: number;           // largo (line) o diámetro (circle)
  angle: number;          // rad (usa line)
  color: string;          // css
  carriedBy: number | null;
  text?: string;          // para kind:"label"
};

export type Ant = {
  id:number;
  kind: AntKind;
  x:number; y:number; vx:number; vy:number;
  state: AntState;
  ageTicks?: number;

  homeHexId: number | null;
  hungerUnd?: number;
  starveTicks?: number;

  carryingUnits?: number;
  lastFoodPos?: {x:number;y:number}|null;

  attackCd?: number;

  /** si la builder lleva una deco suelta */
  carryingDecoId?: number | null;

  energyPct?: number;
  totalDistPx?: number;
  waitTicks?: number;
  targetHexId?: number | null;
};

export type Food    = { x:number; y:number; amount:number; initial:number };
export type Hazard  = { x:number; y:number; r:number; hp:number; vx:number; vy:number };
export type Corpse  = { x:number; y:number; units:number };
export type Beacon  = { x:number; y:number; strength:number; decay:number; ttl:number };

/** Huevos  extendido para los sistemas de cría y UI */
export type EggBatch = {
  active: boolean;
  fed: number;
  hatchTicks?: number;
  tStart?: number;
  born?: number;
  count?: number;
  ageTicks?: number;
  spots?: {x:number;y:number}[];
};

export type Hex = {
  id: number;
  cx: number; cy: number;
  sidePx: number;
  targetUnits: number;
  builtUnits: number;
  host: HostKind;
  capacity: number;
  occupancy: number;
  completed: boolean;
  stockUnd: number;
  eggs?: EggBatch;

  aq?: number;
  ar?: number;

  connections?: number;
  decos?: Decoration[];
};

export type WorldMeta = {
  broodTargetHexId: number | null;
  broodEggsStaged: number;
  broodTransferPending: boolean;
  buildCooldownTicks: number;
};

export type World = {
  ants: Ant[];
  food: Food[];
  hazards: Hazard[];
  corpses: Corpse[];
  beacons: Beacon[];

  looseDecos: Decoration[];
  nextDecoId: number;

  stockFood?: number;      // (legacy) si lo usas en otros sitios
  stockTotal?: number;     // (legacy)
 

  hexes: Hex[];
  nextHexId: number;

  spawnCooldown?: number;
  nextAntId: number;
  noFoodTicks?: number;

  camera?: Camera;
  ui?: UIState;

  meta?: WorldMeta;

  _tick?: number;
};
