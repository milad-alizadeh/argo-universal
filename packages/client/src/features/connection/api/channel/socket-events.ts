export interface SocketEvent {
  data?: string;
  code?: number;
  reason?: string;
}

export type Listener = (event: SocketEvent) => void;

// The listeners of a WebSocket-shaped object: what `addEventListener` keeps and `emit` calls.
export class SocketEvents {
  private readonly listeners = new Map<string, Set<Listener>>();

  public add(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  public remove(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  public emit<Target>(target: Target, type: string, event: SocketEvent): void {
    for (const listener of this.listeners.get(type) ?? [])
      listener.call(target, event);
  }
}

/*
 * What a channel's WebSocket-shaped objects share: the ready state, the listeners, and closing once.
 */
export abstract class EventedSocket {
  public readyState: number = WebSocket.CONNECTING;
  public binaryType = 'arraybuffer';
  private readonly events = new SocketEvents();

  public addEventListener(type: string, listener: Listener): void {
    this.events.add(type, listener);
  }

  public removeEventListener(type: string, listener: Listener): void {
    this.events.remove(type, listener);
  }

  protected finish(code: number, reason = ''): void {
    if (this.readyState === WebSocket.CLOSED) return;

    this.readyState = WebSocket.CLOSED;
    this.emit('close', { code, reason });
  }

  protected emit(type: string, event: SocketEvent): void {
    this.events.emit(this, type, event);
  }
}
