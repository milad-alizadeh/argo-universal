import { expect, it } from 'vitest';
import { setTodoStep, setTodos, todoProgress } from './todos';

const statuses = (todos: readonly { status: string }[]): string[] =>
  todos.map(({ status }) => status);

const three = setTodos([
  { content: 'Read', status: 'pending' },
  { content: 'Change', status: 'pending' },
  { content: 'Test', status: 'pending' },
]);

it('starts the first pending step of a list set with none in progress', () => {
  expect(statuses(three)).toEqual(['in_progress', 'pending', 'pending']);
});

it('keeps the step the Agent set in progress', () => {
  const todos = setTodos([
    { content: 'Read', status: 'pending' },
    { content: 'Change', status: 'in_progress' },
  ]);

  expect(statuses(todos)).toEqual(['pending', 'in_progress']);
});

it('starts the next pending step when a step completes', () => {
  const todos = setTodoStep(three, 1, 'completed') ?? [];

  expect(statuses(todos)).toEqual(['completed', 'in_progress', 'pending']);
  expect(todoProgress(todos)).toEqual({ done: 1, total: 3 });
});

const completeAll = (todos: typeof three): typeof three =>
  todos.reduce(
    (list, _, index) => setTodoStep(list, index + 1, 'completed') ?? list,
    todos,
  );

it('starts nothing once no step is pending', () => {
  const done = completeAll(three);

  expect(statuses(done)).toEqual(['completed', 'completed', 'completed']);
  expect(todoProgress(done)).toEqual({ done: 3, total: 3 });
});

// Sonnet completed only the last of four steps and the list ended at 1/4 with the work done (#2226 eval).
it('completes every unfinished step before the one completed', () => {
  const todos = setTodoStep(three, 3, 'completed') ?? [];

  expect(statuses(todos)).toEqual(['completed', 'completed', 'completed']);
  expect(todoProgress(todos)).toEqual({ done: 3, total: 3 });
});

it('leaves the steps after the one completed as they were', () => {
  const todos = setTodoStep(three, 2, 'completed') ?? [];

  expect(statuses(todos)).toEqual(['completed', 'completed', 'in_progress']);
});

it('starts a later step without completing the ones before it', () => {
  const todos = setTodoStep(three, 3, 'in_progress') ?? [];

  expect(statuses(todos)).toEqual(['in_progress', 'pending', 'in_progress']);
});

it('finds no step 4 in a list of three', () => {
  const step = 4;
  expect(setTodoStep(three, step, 'completed')).toBeUndefined();
});
