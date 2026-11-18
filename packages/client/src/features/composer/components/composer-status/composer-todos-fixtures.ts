import {
  composerTodos,
  composerTodosDone,
} from '../../../../../mocks/composer-mock';
import type { ComposerTodosProps } from './composer-todos';

// A step under way: the trigger names it and the marks stand for the steps before it.
export const runningTodos = {
  entries: composerTodos,
  disabled: false,
} satisfies ComposerTodosProps;

// Every step done: all the marks fill and no step is named.
export const completedTodos = {
  entries: composerTodosDone,
  disabled: false,
} satisfies ComposerTodosProps;
