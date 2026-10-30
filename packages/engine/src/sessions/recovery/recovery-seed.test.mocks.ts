import type { Database } from '@repo/db';
import { writeJobs } from '../../storage';
import { TurnInsertJob } from '../session-storage';
import {
  runningTurnId,
  completedToolId,
  failedToolId,
  cancelledToolId,
  settledCompletedToolId,
  settledRunningToolId,
  messageRow,
  toolRow,
  seedStoredFeedRows,
} from './recovery-rows.test.mocks';

export function seedInterruptedTurn(database: Database): void {
  writeJobs(database, [
    new TurnInsertJob({
      turn: { id: runningTurnId, sessionId: 'session-1', status: 'running' },
    }),
    new TurnInsertJob({
      turn: {
        id: 'ended-turn',
        sessionId: 'session-1',
        status: 'ended',
        stopReason: 'end_turn',
        endedAt: 10,
      },
    }),
  ]);
  seedStoredFeedRows(database, {
    sessionId: 'session-1',
    maxRevision: 20,
    rows: [
      messageRow('message', 0, 2),
      toolRow({
        id: 'pending-tool',
        position: 1,
        revision: 4,
        status: 'pending',
      }),
      toolRow({
        id: 'running-tool',
        position: 2,
        revision: 6,
        status: 'in_progress',
      }),
      toolRow({
        id: completedToolId,
        position: 3,
        revision: 8,
        status: 'completed',
      }),
      toolRow({
        id: failedToolId,
        position: 4,
        revision: 10,
        status: 'failed',
      }),
      toolRow({
        id: cancelledToolId,
        position: 5,
        revision: 12,
        status: 'cancelled',
      }),
      toolRow({
        id: 'settled-pending-tool',
        position: 6,
        revision: 14,
        status: 'pending',
        state: 'settled',
      }),
      toolRow({
        id: settledCompletedToolId,
        position: 7,
        revision: 16,
        status: 'completed',
        state: 'settled',
      }),
      toolRow({
        id: settledRunningToolId,
        position: 8,
        revision: 18,
        status: 'in_progress',
        state: 'settled',
      }),
    ],
  });
  seedStoredFeedRows(database, {
    sessionId: 'session-2',
    maxRevision: 5,
    rows: [messageRow('message', 0, 1)],
  });
}
