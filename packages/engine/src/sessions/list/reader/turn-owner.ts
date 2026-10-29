import { SessionRecord } from '@repo/contracts';
import type { Database } from '@repo/db';
import { turn } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { OpenSessionsActorRef } from '../../open-sessions-machine';
import type { QueuedSessionRows } from '../../session-storage/session-storage';
import type { ListReadInput } from './input';

type OwnerInput = {
  database: Database;
  sessions: OpenSessionsActorRef;
  projection: QueuedSessionRows;
  turnId: string;
  validate: ListReadInput['validate'];
};

export function readTurnSessionIds(input: OwnerInput): string[] {
  const pendingSessionId = input.projection.turnSessionId(input.turnId);

  if (pendingSessionId) return [pendingSessionId];

  const live = Object.values(
    input.sessions.getSnapshot().context.sessions,
  ).find(
    (actor): boolean =>
      actor.getSnapshot().context.activeTurnId === input.turnId,
  );

  return live ? [live.getSnapshot().context.sessionId] : storedOwner(input);
}

function storedOwner(input: OwnerInput): string[] {
  const stored = input.database
    .select({ sessionId: turn.sessionId })
    .from(turn)
    .where(eq(turn.id, input.turnId))
    .get();

  const id =
    stored &&
    input.validate((): string =>
      SessionRecord.shape.id.parse(stored.sessionId),
    );

  return id ? [id] : [];
}
