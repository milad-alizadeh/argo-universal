import { z } from 'zod';
import { sessionColumns } from '../columns';

// A step's standing: the statuses of an ACP plan entry, which the checklist reaches the Feed as (ADR-0006).
export const TodoStatus = z.enum(['pending', 'in_progress', 'completed']);

export type TodoStatus = z.infer<typeof TodoStatus>;

const callingSession = sessionColumns.shape.id
  .optional()
  .describe(
    'The Session the Todo list belongs to; the calling Session when left out.',
  );

// More steps than any Agent's work has; a longer list is a mistake.
const maxTodos = 100;

// Input of `session.setTodos`: the whole checklist, in the order the Agent works through it (ADR-0053).
export const SessionSetTodosInput = z.strictObject({
  todos: z
    .array(
      z.strictObject({
        content: z.string().trim().min(1).describe('The step, in a few words.'),
        status: TodoStatus.default('pending'),
      }),
    )
    .min(1)
    .max(maxTodos),
  sessionId: callingSession,
});

export type SessionSetTodosInput = z.infer<typeof SessionSetTodosInput>;

// Input of `session.setTodoStep`: one step of the checklist, by its number from 1.
export const SessionSetTodoStepInput = z.strictObject({
  step: z.int().min(1).describe('The number of the step, counted from 1.'),
  status: TodoStatus,
  sessionId: callingSession,
});

export type SessionSetTodoStepInput = z.infer<typeof SessionSetTodoStepInput>;

// How far the checklist is: the steps done, and how many there are.
export const TodoProgress = z.strictObject({
  done: z.int().min(0),
  total: z.int().min(0),
});

export type TodoProgress = z.infer<typeof TodoProgress>;

// Whether Sessions keep a checklist, which the person turns on or off in Settings.
export const TodoListSetting = z.strictObject({ enabled: z.boolean() });

export type TodoListSetting = z.infer<typeof TodoListSetting>;

// The two Operations that keep the checklist; the App draws no Tool call for them.
export const todoOperationIds = [
  'session.setTodos',
  'session.setTodoStep',
] as const;
