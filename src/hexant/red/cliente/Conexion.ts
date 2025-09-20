/**
 * Conexion  wrapper simple de WebSocket con eventos.
 * (Solo crea la API; puedes no usarla aún).
 */
export class Conexion extends EventTarget {
  private ws: WebSocket | null = null;
  private url = "";

  connect(url:string){
    this.url = url;
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";
    this.ws.onopen = () => this.dispatchEvent(new Event("open"));
    this.ws.onclose = () => this.dispatchEvent(new Event("close"));
    this.ws.onerror = () => this.dispatchEvent(new Event("error"));
    this.ws.onmessage = (ev) => {
      this.dispatchEvent(new MessageEvent("message", { data: ev.data }));
    };
  }

  send(data:string|ArrayBufferLike|Blob){
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(data);
  }

  close(){
    if (this.ws) this.ws.close();
    this.ws = null;
  }
}
