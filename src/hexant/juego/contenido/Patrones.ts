export type PatternKind =
  | "triad" | "hive7" | "hive19" | "stair" | "arc" | "vee" | "blob" | "random";

export type StampOpts = {
  kind?: PatternKind;
  cellSize?: number;
  amountPerCell?: number;
  rotation?: number;
  mirror?: boolean;
  jitter?: number;
};

type Axial = [number, number];

function axialToPixel(q: number, r: number, size: number) {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = size * ((3 / 2) * r);
  return { x, y };
}
function rotateAxial([q, r]: Axial, times: number): Axial {
  let x = q, z = r, y = -x - z;
  const rot = ((times % 6) + 6) % 6;
  for (let i = 0; i < rot; i++) {
    const nx = -z, ny = -x, nz = -y;
    x = nx; y = ny; z = nz;
  }
  return [x, z];
}
function mirrorAxial([q, r]: Axial): Axial { return [-q, r]; }
function hexDisk(radius: number): Axial[] {
  const out: Axial[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) out.push([q, r]);
  }
  return out;
}
function hexRing(radius: number): Axial[] {
  if (radius <= 0) return [[0, 0]];
  const dirs: Axial[] = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  let q = -radius, r = radius;
  const res: Axial[] = [];
  for (let d = 0; d < 6; d++) {
    for (let i = 0; i < radius; i++) { res.push([q,r]); q += dirs[d][0]; r += dirs[d][1]; }
  }
  return res;
}
function pat_triad(): Axial[] { return [[0,0],[1,0],[0,1]]; }
function pat_hive7(): Axial[] { return hexDisk(1); }
function pat_hive19(): Axial[] { return hexDisk(2); }
function pat_stair(): Axial[] {
  const dirs: Axial[] = [[1,0],[1,-1]];
  const out: Axial[] = [[0,0]];
  let q = 0, r = 0;
  for (let i = 0; i < 7; i++) { const d = dirs[i%2]; q += d[0]; r += d[1]; out.push([q,r]); }
  return out;
}
function pat_arc(): Axial[] {
  const ring = hexRing(3);
  const take = Math.floor(ring.length / 3);
  const start = Math.floor(Math.random() * ring.length);
  const out: Axial[] = [];
  for (let i = 0; i < take; i++) out.push(ring[(start + i) % ring.length]);
  out.push([0,0]); return out;
}
function pat_vee(): Axial[] {
  const A: Axial[] = [[0,0],[1,0],[2,0],[3,0]];
  const B: Axial[] = [[0,0],[0,1],[0,2],[0,3]];
  return [[0,0], ...A.slice(1), ...B.slice(1)];
}
function pat_blob(): Axial[] {
  const dirs: Axial[] = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  const steps = 18 + Math.floor(Math.random()*10);
  let q=0, r=0; const set=new Set<string>(); set.add("0,0");
  for (let i=0;i<steps;i++){ const d=dirs[Math.floor(Math.random()*6)]; q+=d[0]; r+=d[1]; set.add(`${q},${r}`); }
  return Array.from(set).map(s=>s.split(",").map(Number) as Axial);
}
const LIB: Record<Exclude<PatternKind,"random">, () => Axial[]> = {
  triad: pat_triad, hive7: pat_hive7, hive19: pat_hive19,
  stair: pat_stair, arc: pat_arc, vee: pat_vee, blob: pat_blob,
};

export type WorldLike = { food: Array<{ x:number; y:number; amount:number; initial:number }> };

export function stampFoodPattern(
  world: WorldLike,
  cx: number,
  cy: number,
  opts: StampOpts = {}
){
  const {
    kind="random", cellSize=22, amountPerCell=10, jitter=0.8,
    rotation=Math.floor(Math.random()*6), mirror=Math.random()<0.5,
  } = opts;

  const pickKind: Exclude<PatternKind,"random"> =
    kind === "random"
      ? (["triad","hive7","hive19","stair","arc","vee","blob"][Math.floor(Math.random()*7)] as any)
      : kind;

  let cells = LIB[pickKind]();
  cells = cells.map(a => rotateAxial(a, rotation));
  if (mirror) cells = cells.map(mirrorAxial);

  const uniq = new Map<string, Axial>();
  for (const c of cells) uniq.set(`${c[0]},${c[1]}`, c);

  for (const [q, r] of uniq.values()) {
    const { x, y } = axialToPixel(q, r, cellSize);
    const jx = (Math.random()*2-1) * jitter;
    const jy = (Math.random()*2-1) * jitter;
    world.food.push({ x: cx + x + jx, y: cy + y + jy, amount: amountPerCell, initial: amountPerCell });
  }
}
