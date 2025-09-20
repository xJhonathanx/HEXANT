/** Mensajes de red (cliente-servidor)  versión mínima para compilar. */
export type ClientMsg =
  | { t: "hello"; name: string }
  | { t: "input"; seq: number; dt: number; intent: any };

export type ServerMsg =
  | { t: "welcome"; id: string }
  | { t: "snapshot"; tick: number; state: any; ackSeq?: number };
