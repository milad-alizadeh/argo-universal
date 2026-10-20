import { fn } from 'storybook/test';
import {
  subagentNow,
  subagentStates,
} from '../../../features/sessions/components/subagent-list/subagent-list.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { runningSession } from './session-detail-view.mocks';

export const subagentsSession = {
  state: 'open',
  ...runningSession,
  subagents: {
    subagents: subagentStates.severalMixed,
    now: subagentNow,
    onSelect: fn(),
  },
} satisfies SessionDetailViewProps;
