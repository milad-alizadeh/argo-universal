import { delegatedTurn } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import { watchOpenedSessions } from '../opened-sessions';
import { pendingInputRequest } from '../pending-input';
import type { SessionHandlerSources } from '../session-sources';
import { waitingSkills } from './skill';

function currentRequests(sources: SessionHandlerSources, starterId: string) {
  return sources.database
    .select()
    .from(delegatedTurn)
    .where(
      and(
        eq(delegatedTurn.starterId, starterId),
        eq(delegatedTurn.delivered, false),
        eq(delegatedTurn.revoked, false),
      ),
    )
    .all()
    .flatMap(({ sourceId, turnId }) => {
      const live = sources.open.context(sourceId);
      if (!live || live.activeTurnId !== turnId) return [];

      const input = pendingInputRequest(live);
      if (!input) return [];

      return [
        {
          sessionId: sourceId,
          requestId: input.request.requestId,
          kind: input.kind,
          title: sources.open.queued(sourceId).title || 'Started Session',
        },
      ];
    });
}

function currentAttention(sources: SessionHandlerSources, sessionId: string) {
  return {
    requests: currentRequests(sources, sessionId),
    skills: waitingSkills(sources, sessionId),
  };
}

export async function* delegatedAttention(
  sources: SessionHandlerSources,
  starterId: string,
  signal: AbortSignal,
): AsyncGenerator<ReturnType<typeof currentAttention>> {
  let wake = Promise.withResolvers<void>();
  const changed = (): void => wake.resolve();
  const subscriptions = new Map<string, { unsubscribe(): void }>();
  const stopOpened = watchOpenedSessions(sources, (id, startedBy) => {
    if (startedBy !== starterId) return;
    subscriptions.get(id)?.unsubscribe();
    const actor = sources.open.session(id);
    if (actor)
      subscriptions.set(
        id,
        actor.subscribe({
          next: changed,
          complete: () => {
            subscriptions.delete(id);
            changed();
          },
        }),
      );
    changed();
  });
  const writer = sources.findWriter()?.on('writer.committed', changed);
  signal.addEventListener('abort', changed, { once: true });

  try {
    let previous: string | undefined;
    while (!signal.aborted) {
      wake = Promise.withResolvers<void>();
      const requests = currentAttention(sources, starterId);
      const key = JSON.stringify(requests);
      if (key !== previous) {
        previous = key;
        yield requests;
      }
      if (!signal.aborted) await wake.promise;
    }
  } finally {
    stopOpened();
    writer?.unsubscribe();
    signal.removeEventListener('abort', changed);
    for (const subscription of subscriptions.values())
      subscription.unsubscribe();
  }
}
