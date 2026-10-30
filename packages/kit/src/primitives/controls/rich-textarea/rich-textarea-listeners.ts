// Callbacks told when something changes; `add` hands back the way to stop being told.
export class Listeners {
  private readonly callbacks = new Set<() => void>();

  add = (callback: () => void): (() => void) => {
    this.callbacks.add(callback);

    return () => this.callbacks.delete(callback);
  };

  notify = (): void => {
    for (const callback of this.callbacks) callback();
  };
}
