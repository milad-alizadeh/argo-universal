/*
 * Session storage: the Writer jobs that store Sessions and their Turns, and the reads that see Sessions and
 * Turns as the Writer will leave them, with every queued job replayed through its own projection.
 */
export { SessionInsertJob } from './session-storage-insert';

export { SessionRowUpdateJob } from './session-storage-update';

export { SessionTitleJob } from './session-storage-title';

export { SessionDeleteJob } from './session-storage-delete';

export { TurnInsertJob, TurnUpdateJob } from './session-storage-turn';

export type {
  QueuedSessionChange,
  QueuedSessionInsert,
  QueuedTurnChange,
  QueuedTurnInsert,
} from './queued-roles';

export {
  type QueuedSessionRows,
  readQueuedSessionRows,
} from './queued-session-rows';

export {
  readLatestTurn,
  readLatestTurns,
  type RowSources,
} from './session-storage-latest';
