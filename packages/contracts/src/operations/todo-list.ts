import { z } from 'zod';
import { TodoListSetting } from '../sessions/todos';
import type { OperationDefinition } from './index';

// Whether Sessions keep a checklist (ADR-0053): read by anyone, changed by the person.
export const todoListOperations = {
  'agent.getTodoList': {
    id: 'agent.getTodoList',
    label: 'Read Todo list setting',
    icon: 'checklist',
    description: 'Read whether Sessions keep a Todo list.',
    params: z.strictObject({}).default({}),
    result: TodoListSetting,
    tier: 'read',
    policy: 'allow',
    keywords: ['settings', 'todo', 'checklist', 'progress'],
  },
  'agent.setTodoList': {
    id: 'agent.setTodoList',
    label: 'Change Todo list setting',
    icon: 'checklist',
    description:
      'Turn the Todo list on or off. Off, new Sessions are not asked to keep one and none is shown.',
    params: TodoListSetting,
    result: TodoListSetting,
    tier: 'act',
    policy: 'allow',
    keywords: ['settings', 'todo', 'checklist', 'enable', 'disable'],
  },
} as const satisfies Record<string, OperationDefinition>;
