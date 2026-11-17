import { todoOperationIds, type SessionUpdate } from '@repo/contracts';
import { z } from 'zod';

const TodoOperationId = z.enum(todoOperationIds);

// `operation_run`'s own input, which claude-agent-acp sends as it is and codex-acp sends under `arguments`.
const RunInput = z.union([
  z.object({ id: TodoOperationId }),
  z.object({ arguments: z.object({ id: TodoOperationId }) }),
]);

type ToolRow = Extract<SessionUpdate, { sessionUpdate: 'tool_call_update' }>;

// The Engine names the Tool call of an Operation by its id; the Agent names its own `operation_run`.
const keepsTodoList = (row: ToolRow): boolean =>
  TodoOperationId.safeParse(row.name).success ||
  (row.name === 'operation_run' && RunInput.safeParse(row.rawInput).success);

// A Tool call that only keeps the Session's checklist, which the Composer already shows, so the Feed draws no row for it (ADR-0053).
export const isTodoCall = (row: SessionUpdate): boolean =>
  row.sessionUpdate === 'tool_call_update' && keepsTodoList(row);
