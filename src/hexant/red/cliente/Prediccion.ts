/**
 * Prediccion — bufferiza entradas locales y gestiona reconciliación.
 * Stub mínimo para compilar; lógica real se añadirá luego.
 */
export class Prediccion {
  private seq = 0;
  private buffer: Array<{ seq:number; intent:any; dt:number }> = [];

  nextSeq(){ return ++this.seq; }

  push(intent:any, dt:number){
    const seq = this.nextSeq();
    this.buffer.push({ seq, intent, dt });
    return seq;
  }

  ack(seq:number){
    // descarta todo <= seq
    this.buffer = this.buffer.filter(it => it.seq > seq);
  }

  pending(){ return this.buffer.slice(); }
}
