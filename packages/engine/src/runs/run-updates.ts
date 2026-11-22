import { EventEmitter, on } from 'node:events';
import { unwatchFile, watchFile } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { RunStatusResult } from '@repo/contracts';
import { runConfigurationsFile } from './run-configurations';
import type { RunCheckout } from './runs';

const configurationPollMs = 250;

const checkoutKey = ({ projectId, checkoutPath }: RunCheckout): string =>
  JSON.stringify([projectId, checkoutPath]);

function watchConfigurations(
  checkout: RunCheckout,
  changed: () => void,
): () => void {
  const path = join(checkout.checkoutPath, runConfigurationsFile);
  watchFile(
    path,
    { persistent: false, interval: configurationPollMs },
    changed,
  );

  return (): void => unwatchFile(path, changed);
}

async function* updatedStatuses(
  changes: ReturnType<typeof on>,
  read: () => Promise<RunStatusResult>,
): AsyncGenerator<RunStatusResult> {
  let previous = await read();
  yield previous;

  for await (const _ of changes) {
    const status = await read();

    if (isDeepStrictEqual(previous, status)) continue;
    previous = status;
    yield status;
  }
}

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
    const unwatch = watchConfigurations(checkout, () => this.changed(checkout));

    try {
      yield* updatedStatuses(changes, read);
    } catch (error) {
      if (!signal.aborted) throw error;
    } finally {
      unwatch();
      await changes.return?.();
    }
  }
}
