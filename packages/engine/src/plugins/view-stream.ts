import { on } from 'node:events';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
import type { ViewSnapshot } from './view-messages';

const snapshotOf = (view: ViewSnapshot): ViewMessage[] =>
  view.root
    ? [
        {
          type: 'snapshot',
          revision: view.revision,
          root: view.root,
          viewId: view.opening.viewId,
        },
      ]
    : [];

// Aborting a subscription ends its stream quietly.
async function* untilAborted<T>(
  source: AsyncIterable<T>,
  signal: AbortSignal,
): AsyncGenerator<T> {
  try {
    yield* source;
  } catch (error) {
    if (!signal.aborted) throw error;
  }
}

// The stream starts listening before the snapshot is handed out, so no patch falls between the two.
export async function* messages(
  view: ViewSnapshot,
  signal: AbortSignal,
): AsyncGenerator<ViewMessage> {
  const stream = on(view.events, 'message', { signal, close: ['close'] });

  try {
    yield* snapshotOf(view);

    for await (const [message] of untilAborted(stream, signal)) yield message;
  } finally {
    await stream.return?.();
  }
}
