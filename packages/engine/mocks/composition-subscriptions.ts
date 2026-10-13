import type { SessionListUpdate } from '@repo/contracts';

export async function nextMatching<T>(
  iterator: AsyncIterator<T>,
  matches: (value: T) => boolean,
): Promise<T> {
  for (;;) {
    const next = await iterator.next();
    const value = requireUpdate(next);
    if (matches(value)) return value;
  }
}

export async function closeSubscription<T>(
  iterator: AsyncIterator<T>,
): Promise<void> {
  await iterator.return?.();
}

export function changedSession(
  update: SessionListUpdate,
): Extract<SessionListUpdate, { type: 'changed' }>['session'] {
  if (update.type !== 'changed') throw new Error('Expected a changed Session');
  return update.session;
}

function requireUpdate<T>(next: IteratorResult<T>): T {
  if (next.done)
    throw new Error('Subscription ended before its expected update');
  return next.value;
}
