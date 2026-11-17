import type {
  SessionSetTodoStepInput,
  SessionSetTodosInput,
  TodoProgress,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { readTodoList } from '../../todo-list';
import { sendSessionCommand } from '../session-command';
import type { SessionActorRef } from '../session-machine';
import type { HandlerSources } from '../session-sources';
import { setTodoStep, setTodos, todoProgress, type Todos } from './todos';

type TodoSources = HandlerSources<'database', 'admit' | 'live'>;

const refusal = (message: string): TRPCError =>
  new TRPCError({ code: 'BAD_REQUEST', message });

// The live Session whose checklist an Operation changes; none while the person has the checklist off.
function todoSession(
  sources: TodoSources,
  sessionId: string | undefined,
): SessionActorRef {
  if (sessionId === undefined)
    throw refusal(
      'Pass sessionId: the Session the Todo list belongs to. A Session that runs this needs no sessionId.',
    );

  if (!readTodoList(sources.database).enabled)
    throw refusal(
      'The Todo list is turned off in Settings. Carry on without one and do not call this again.',
    );

  sources.open.admit();

  return sources.open.live(sessionId);
}

function keep(session: SessionActorRef, todos: Todos): TodoProgress {
  sendSessionCommand(session, { type: 'session.setTodos', todos });

  return todoProgress(todos);
}

// Argo only: the Agent sets its whole checklist (ADR-0053).
export async function setSessionTodos(
  sources: TodoSources,
  input: SessionSetTodosInput,
): Promise<TodoProgress> {
  return keep(todoSession(sources, input.sessionId), setTodos(input.todos));
}

// The list with one step changed, or why the Agent cannot change it.
function steppedTodos(
  current: Todos | null,
  { step, status }: SessionSetTodoStepInput,
): Todos {
  if (!current)
    throw refusal(
      'This Session has no Todo list yet. Run session.setTodos with every step first.',
    );

  const todos = setTodoStep(current, step, status);

  if (todos) return todos;

  throw refusal(
    `The Todo list has ${current.length} steps, counted from 1; there is no step ${step}.`,
  );
}

// Argo only: the Agent changes one step of the list it last set, which the live Session holds.
export async function setSessionTodoStep(
  sources: TodoSources,
  input: SessionSetTodoStepInput,
): Promise<TodoProgress> {
  const session = todoSession(sources, input.sessionId);
  const current = session.getSnapshot().context.todos;

  return keep(session, steppedTodos(current, input));
}
