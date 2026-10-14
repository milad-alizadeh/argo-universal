import type { SessionListUpdate } from '@repo/contracts';
import { onTestFinished } from 'vitest';
import { startEngineTestHost } from './engine';

type EngineHost = Awaited<ReturnType<typeof startEngineTestHost>>;

interface ListWatch {
  controller: AbortController;
  caller: EngineHost['caller'];
}

export function watchEngineList(
  createCaller: EngineHost['createCaller'],
): ListWatch {
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());

  return { controller, caller: createCaller({ signal: controller.signal }) };
}

export async function nextListChange(
  updates: AsyncIterator<SessionListUpdate>,
  matches: (update: SessionListUpdate) => boolean,
): Promise<SessionListUpdate> {
  for (;;) {
    const update = await nextListValue(updates);

    if (matches(update)) return update;
  }
}

async function nextListValue(
  updates: AsyncIterator<SessionListUpdate>,
): Promise<SessionListUpdate> {
  const next = await updates.next();

  if (next.done) throw new Error('List subscription ended');

  return next.value;
}

export async function finishSubscription<T>(
  subscription: AsyncIterator<T>,
): Promise<IteratorResult<T>> {
  if (!subscription.return) throw new Error('Subscription cannot be closed');

  return subscription.return();
}
