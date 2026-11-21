import { EventEmitter, on } from 'node:events';
import type { RunStatusResult } from '@repo/contracts';
import type { RunCheckout } from './runs';

const checkoutKey = ({ projectId, checkoutPath }: RunCheckout): string =>
  JSON.stringify([projectId, checkoutPath]);

export class RunUpdates {
  private readonly events = new EventEmitter().setMaxListeners(0);

  public changed(checkout: RunCheckout): void {
    this.events.emit(checkoutKey(checkout));
  }

  public outputChanged(checkout: RunCheckout, name: string): void {
    this.events.emit(this.outputKey(checkout, name));
  }

  public listenToOutput(
    checkout: RunCheckout,
    name: string,
    changed: () => void,
  ): () => void {
    const key = this.outputKey(checkout, name);
    this.events.on(key, changed);

    return (): void => {
      this.events.off(key, changed);
    };
  }

  private outputKey(checkout: RunCheckout, name: string): string {
    return JSON.stringify([checkoutKey(checkout), name]);
  }

  public async *watch(
    checkout: RunCheckout,
    read: () => Promise<RunStatusResult>,
    signal: AbortSignal,
  ): AsyncGenerator<RunStatusResult> {
    if (signal.aborted) return;
    const changes = on(this.events, checkoutKey(checkout), { signal });

    try {
      yield await read();

      for await (const _ of changes) yield await read();
    } catch (error) {
      if (!signal.aborted) throw error;
    } finally {
      await changes.return?.();
    }
  }
}
