import type { DelegatedAttention, DelegatedInput } from '@repo/contracts';
import { delegatedTurn } from '@repo/db/schema';
import { and, eq } from 'drizzle-orm';
import { watchStartedSessions } from '../opened-sessions';
import { pendingInputRequest } from '../pending-input';
import type { HandlerSources } from '../session-sources';
import { waitingSkills } from './skill';

type AttentionSources = HandlerSources<
  'database' | 'findWriter',
  'context' | 'queued' | 'session' | 'ids' | 'subscribe'
>;

function currentRequests(
  sources: AttentionSources,
  starterId: string,
): DelegatedInput[] {
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

function currentAttention(
  sources: AttentionSources,
  sessionId: string,
): DelegatedAttention {
  return {
    requests: currentRequests(sources, sessionId),
    skills: waitingSkills(sources, sessionId),
  };
}

function watchStartedInput(
  sources: AttentionSources,
  starterId: string,
  changed: () => void,
): () => void {
  return watchStartedSessions(sources, starterId, () => ({
    availability: changed,
    changed,
  }));
}

function watchAttention(
  sources: AttentionSources,
  { starterId, signal }: { starterId: string; signal: AbortSignal },
  changed: () => void,
): () => void {
  const stopStarted = watchStartedInput(sources, starterId, changed);
  const writer = sources.findWriter()?.on('writer.committed', changed);

  signal.addEventListener('abort', changed, { once: true });

  return () => {
    stopStarted();
    writer?.unsubscribe();
    signal.removeEventListener('abort', changed);
  };
}

type AttentionReader = {
  read: () => DelegatedAttention | undefined;
  changed: () => void;
  wait: () => Promise<void>;
};

function attentionReader(
  sources: AttentionSources,
  starterId: string,
): AttentionReader {
  let wake = Promise.withResolvers<void>();
  let previous: string | undefined;

  return {
    read: () => {
      wake = Promise.withResolvers<void>();
      const next = currentAttention(sources, starterId);
      const key = JSON.stringify(next);

      if (key === previous) return;
      previous = key;

      return next;
    },
    changed: () => wake.resolve(),
    wait: () => wake.promise,
  };
}

export async function* delegatedAttention(
  sources: AttentionSources,
  starterId: string,
  signal: AbortSignal,
): AsyncGenerator<DelegatedAttention> {
  const reader = attentionReader(sources, starterId);
  const stop = watchAttention(sources, { starterId, signal }, reader.changed);

  try {
    while (!signal.aborted) {
      const next = reader.read();

      if (next) yield next;

      if (!signal.aborted) await reader.wait();
    }
  } finally {
    stop();
  }
}
