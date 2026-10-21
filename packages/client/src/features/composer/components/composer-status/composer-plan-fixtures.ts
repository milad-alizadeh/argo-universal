import {
  composerPlan,
  composerPlanDone,
} from '../../../../../mocks/composer-mock';
import type { ComposerPlanProps } from './composer-plan';

// A step under way: the trigger names it and the marks stand for the steps before it.
export const runningPlan = {
  entries: composerPlan,
  disabled: false,
} satisfies ComposerPlanProps;

// Every step done: all the marks fill and no step is named.
export const completedPlan = {
  entries: composerPlanDone,
  disabled: false,
} satisfies ComposerPlanProps;
