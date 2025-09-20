/**
 * Reloj.ts  Bucle de juego con rAF y acumulador de tiempo fijo (60 Hz).
 * Llama a onTick(dtSec) con un dt fijo (1/60) tantas veces como haga falta.
 */
export type TickFn = (dtSec: number) => void;

export class Reloj {
  private running = false;
  private last = 0;
  private acc = 0;
  private rafId = 0;
  private readonly FIXED = 1 / 60;
  private onTick: TickFn;

  constructor(onTick: TickFn){ this.onTick = onTick; }

  start(){
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = () => {
      if (!this.running) return;
      const now = performance.now();
      let dt = (now - this.last) / 1000;
      if (dt > 0.25) dt = 0.25; // anti-pauses largos
      this.last = now;
      this.acc += dt;

      while (this.acc >= this.FIXED) {
        this.onTick(this.FIXED);
        this.acc -= this.FIXED;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(){
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}
