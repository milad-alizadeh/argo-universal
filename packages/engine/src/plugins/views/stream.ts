import { on } from 'node:events';
import type { ViewMessage } from '@repo/contracts/plugins/wire';
import type { OpenView } from './open-view';

type Watched = Pick<OpenView, 'drawn' | 'revision' | 'opening' | 'events'>;

const snapshotOf = (view: Watched): ViewMessage[] =>
  view.drawn
    ? [
        {
          type: 'snapshot',
          revision: view.revision,
          root: view.drawn,
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
  view: Watched,
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
