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

  public emit(target: object, type: string, event: SocketEvent): void {
    for (const listener of this.listeners.get(type) ?? [])
      listener.call(target, event);
  }
}
