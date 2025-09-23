/**
 * matematica.ts  Helpers matemáticos puros.
 */
export function randf(a:number,b:number){ return a + Math.random()*(b-a); }
export function clamp(v:number,a:number,b:number){ return Math.max(a, Math.min(b, v)); }
export function dist2(ax:number,ay:number,bx:number,by:number){
  const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy;
}
export function dist(ax:number,ay:number,bx:number,by:number){
  return Math.hypot(ax-bx, ay-by);
}

export const TAU = Math.PI * 2;

export function d2(dx:number, dy:number){ return dx*dx + dy*dy; }

export function approach(a:any, tx:number, ty:number, k=0.015){
  a.vx = (a.vx ?? 0) + (tx - a.x) * k;
  a.vy = (a.vy ?? 0) + (ty - a.y) * k;
  a.x += a.vx; a.y += a.vy;
}

export function approachDamped(a:any, tx:number, ty:number, k=0.015, damp=0.9){
  approach(a, tx, ty, k);
  a.vx *= damp; a.vy *= damp;
}

export function limitSpeed(a:any, max:number){
  const s = Math.hypot(a.vx ?? 0, a.vy ?? 0);
  if (s > max){ const k = max / (s || 1); a.vx *= k; a.vy *= k; }
}

export function inViewRect(x:number, y:number, left:number, top:number, right:number, bottom:number, pad=0){
  return x >= left - pad && x <= right + pad && y >= top - pad && y <= bottom + pad;
}

export function inViewCircle(x:number, y:number, cx:number, cy:number, r:number, pad=0){
  const dx = x - cx, dy = y - cy; const d2 = dx*dx + dy*dy; const R = (r + pad);
  return d2 <= R*R;
}

