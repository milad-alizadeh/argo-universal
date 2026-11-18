import {
  SessionDeclareSubagentRoleInput,
  SessionDeclareSubagentRoleOutput,
} from '../sessions/declare-subagent-role';
import {
  SessionSetTodoStepInput,
  SessionSetTodosInput,
  TodoProgress,
} from '../sessions/todos';
import type { OperationDefinition } from './index';

// The Operations an Agent runs about its own work: the Agents it spawns and its checklist.
export const sessionAgentOperations = {
  'session.setTodos': {
    id: 'session.setTodos',
    label: 'Set Todo list',
    icon: 'checklist',
    description:
      'Set the whole Todo list of your work, in order, so the person sees what is done and what is left. With no step in progress, the first pending step starts.',
    params: SessionSetTodosInput,
    result: TodoProgress,
    tier: 'act',
    keywords: ['todo', 'todos', 'checklist', 'steps', 'progress', 'plan'],
  },
  'session.setTodoStep': {
    id: 'session.setTodoStep',
    label: 'Update Todo step',
    icon: 'checklist',
    description:
      'Change one step of the Todo list by its number, counted from 1. Completing a step starts the next pending one when none is in progress.',
    params: SessionSetTodoStepInput,
    result: TodoProgress,
    tier: 'act',
    keywords: ['todo', 'checklist', 'step', 'progress', 'done'],
  },
  'session.declareSubagentRole': {
    id: 'session.declareSubagentRole',
    label: 'Declare Agent role',
    icon: 'agent',
    description:
      'Before spawning a subagent, name its role; each spawn takes the next declared role, and Argo draws that role for the Agent.',
    params: SessionDeclareSubagentRoleInput,
    result: SessionDeclareSubagentRoleOutput,
    tier: 'act',
    keywords: ['subagent', 'spawn', 'role', 'agent', 'type'],
  },
} as const satisfies Record<string, OperationDefinition>;
