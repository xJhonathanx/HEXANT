import type { World, Hex } from "../../tipos";

export function SistemaPeligros(w:World){
  const q = w.hexes.find((h:Hex)=>h.host==="queen");
  const cx = q?.cx ?? 0, cy = q?.cy ?? 0;
  const R  = (q?.sidePx ?? 40) * 9; // radio de patio simple

  for (const hz of w.hazards){
    const anyHz = hz as any;
    if (anyHz.vx == null){ anyHz.vx = (Math.random()*2-1)*0.6; anyHz.vy = (Math.random()*2-1)*0.6; }
    anyHz.vx += (Math.random()*2-1)*0.05;
    anyHz.vy += (Math.random()*2-1)*0.05;

    hz.x += anyHz.vx; hz.y += anyHz.vy;

    // Rebotar suave si sale del radio
    const dx = hz.x - cx, dy = hz.y - cy;
    const d = Math.hypot(dx,dy) || 1;
    if (d > R){
      hz.x = cx + dx*(R/d);
      hz.y = cy + dy*(R/d);
      anyHz.vx *= 0.5; anyHz.vy *= 0.5;
    }
  }
}
