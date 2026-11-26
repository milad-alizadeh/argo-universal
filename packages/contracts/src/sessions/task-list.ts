import type { SessionInfo, SessionListInput } from './list';

export function matchesTaskSessions(
  row: SessionInfo,
  { taskSessions }: SessionListInput,
): boolean {
  if (taskSessions === 'exclude') return !row.taskSessionId;

  if (taskSessions === 'tasks') return !!row.taskSessionId;

  return (
    taskSessions !== 'started' ||
    (!!row.taskSessionId && row.taskSessionId !== row.sessionId)
  );
}
