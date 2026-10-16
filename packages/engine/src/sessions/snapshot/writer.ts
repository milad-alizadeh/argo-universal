import type { Subscription } from 'xstate';
import type { WriterActorRef } from '../../storage';
import { onWriterChange, type WriterChange } from '../writer-changes';

type SnapshotScope = {
  // The Session and the Subagents its last snapshot showed.
  sessionIds: () => readonly string[];
  changed: () => void;
};

// Calls `changed` when the Writer queues or commits a job for the Session or one of its Subagents.
export function watchSnapshotWriter(
  writer: WriterActorRef | undefined,
  scope: SnapshotScope,
): Subscription | undefined {
  return (
    writer &&
    onWriterChange(writer, (change): void => {
      if (touches(change, scope.sessionIds())) scope.changed();
    })
  );
}

// A Turn change names no Session, so it touches the snapshot whenever the snapshot shows a Subagent.
function touches(change: WriterChange, sessionIds: readonly string[]): boolean {
  return (
    change.sessionIds.some((id): boolean => sessionIds.includes(id)) ||
    (change.turnIds.length > 0 && sessionIds.length > 1)
  );
}
