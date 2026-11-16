import type {
  SessionSetTodosInput,
  TodoProgress,
  TodoStatus,
} from '@repo/contracts';

// One step as the Feed takes it: an ACP plan entry, whose priority Argo neither asks for nor draws.
export type TodoEntry = {
  content: string;
  status: TodoStatus;
  priority: 'medium';
};

// A Session's checklist, in the Agent's order (ADR-0053).
export type Todos = readonly TodoEntry[];

type Todo = SessionSetTodosInput['todos'][number];

const entry = ({ content, status }: Todo): TodoEntry => ({
  content,
  status,
  priority: 'medium',
});

const withStatus = (todos: Todos, index: number, status: TodoStatus): Todos =>
  todos.map((todo, at) => (at === index ? { ...todo, status } : todo));

// With no step in progress the first pending one starts, so a list with work left always shows where the Agent is.
function startNext(todos: Todos): Todos {
  if (todos.some(({ status }) => status === 'in_progress')) return todos;

  return withStatus(
    todos,
    todos.findIndex(({ status }) => status === 'pending'),
    'in_progress',
  );
}

// The whole list the Agent set.
export const setTodos = (todos: readonly Todo[]): Todos =>
  startNext(todos.map(entry));

// Completing a step completes every unfinished step before it: Agents work in order and often mark only where they got to.
const completeThrough = (todos: Todos, index: number): Todos =>
  todos.map((todo, at) =>
    at <= index ? { ...todo, status: 'completed' } : todo,
  );

// The list with one step changed, by its number from 1; undefined when the list has no such step.
export function setTodoStep(
  todos: Todos,
  step: number,
  status: TodoStatus,
): Todos | undefined {
  if (step > todos.length) return undefined;

  const changed =
    status === 'completed'
      ? completeThrough(todos, step - 1)
      : withStatus(todos, step - 1, status);

  return startNext(changed);
}

export const todoProgress = (todos: Todos): TodoProgress => ({
  done: todos.filter(({ status }) => status === 'completed').length,
  total: todos.length,
});
