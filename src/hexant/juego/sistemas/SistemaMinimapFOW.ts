import type { World } from "../../tipos";
import { axialToPixelPT } from "../../utilidades/hex";

function pixelToAxialPT(x:number, y:number, size:number){
  const qf = (Math.sqrt(3)/3 * x - 1/3 * y) / size;
  const rf = (2/3 * y) / size;
  // axial round
  let xC = qf, zC = rf, yC = -xC - zC;
  let rx = Math.round(xC), rz = Math.round(zC), ry = Math.round(yC);
  const xDiff = Math.abs(rx - xC), yDiff = Math.abs(ry - yC), zDiff = Math.abs(rz - zC);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

export function SistemaMinimapFOW(w:World){
  const qh = w.hexes.find(h => (h as any).host === "queen") as any;
  if (!qh) return;
  (w as any).meta = (w as any).meta ?? {};
  const meta:any = (w as any).meta;
  meta.fow = meta.fow ?? { visited: new Set<string>(), scale: 3 };
  const fow:any = meta.fow;

  const S = (qh.sidePx ?? 36) as number;

  // registra la celda actual del scout (o cualquiera con kind==="scout")
  const scouts = (w.ants as any[]).filter(a => a.kind === "scout");
  for (const s of scouts){
    const dx = (s.x ?? 0) - qh.cx;
    const dy = (s.y ?? 0) - qh.cy;
    const a = pixelToAxialPT(dx, dy, S);
    fow.visited.add(`${a.q},${a.r}`);
  }
}
