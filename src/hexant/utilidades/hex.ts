/**
 * hex.ts  Conversión axialpixel (pointy-top) + vértices de hex.
 * E:\GAME\HEXANTV1\src\hexant\utilidades\hex.ts
 */
export function hexVertices(cx:number, cy:number, side:number){
  const out:{x:number;y:number}[] = [];
  for(let i=0;i<6;i++){
    const a = (Math.PI/180) * (60*i - 30); // -30° = pointy top
    out.push({ x: cx + side*Math.cos(a), y: cy + side*Math.sin(a) });
  }
  return out;
}

export function axialToPixelPT(q:number, r:number, size:number){
  const x = size * (Math.sqrt(3)*q + (Math.sqrt(3)/2)*r);
  const y = size * (1.5*r);
  return { x, y };
}
export function pixelToAxialPT(x:number, y:number, cx0:number, cy0:number, size:number){
  const px = x - cx0, py = y - cy0;
  const q = (Math.sqrt(3)/3 * px - 1/3 * py) / size;
  const r = (2/3 * py) / size;
  return { q, r };
}
export function axialRound(q:number, r:number){
  let x=q, z=r, y=-x-z;
  let rx=Math.round(x), rz=Math.round(z), ry=Math.round(y);
  const xdiff=Math.abs(rx-x), ydiff=Math.abs(ry-y), zdiff=Math.abs(rz-z);
  if (xdiff > ydiff && xdiff > zdiff) rx = -ry - rz;
  else if (ydiff > zdiff)             ry = -rx - rz;
  else                                rz = -rx - ry;
  return { q: rx, r: rz };
}
