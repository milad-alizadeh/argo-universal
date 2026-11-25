export interface SocketEvent {
  data?: string;
  code?: number;
  reason?: string;
}

/*
 * What a channel's WebSocket-shaped objects share: the ready state, the platform's own `EventTarget` for listeners, and closing once.
 */
export abstract class EventedSocket extends EventTarget {
  public readyState: number = WebSocket.CONNECTING;
  public binaryType = 'arraybuffer';

  protected finish(code: number, reason = ''): void {
    if (this.readyState === WebSocket.CLOSED) return;

    this.readyState = WebSocket.CLOSED;
    this.emit('close', { code, reason });
  }

  protected emit(type: string, fields: SocketEvent): void {
    this.dispatchEvent(Object.assign(new Event(type), fields));
  }
}
