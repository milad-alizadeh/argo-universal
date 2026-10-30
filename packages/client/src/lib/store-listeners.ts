// The screens that read a store with useSyncExternalStore, told when its state changes.
export class StoreListeners {
  private readonly listeners = new Set<() => void>();

  public readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);

    return () => void this.listeners.delete(listener);
  };

  public notify(): void {
    for (const listener of this.listeners) listener();
  }
}
