import type { SessionBarEntry } from '#features/sessions';
import {
  endedShells,
  shellNow,
} from '../../../../features/sessions/components/shell-list/shell-list.mocks';
import {
  subagentNow,
  subagentStates,
} from '../../../../features/sessions/components/subagent-list/subagent-list.mocks';
import type { SessionInspectorContent } from '../session-inspector-content';

// An open Issue's Session bar line, in its state's tone, as the Issue tracker sends it.
export const summaryLines: SessionBarEntry = {
  pluginId: 'issue-tracker',
  pluginName: 'Issue tracker',
  icon: { sf: 'ticket', material: 'confirmation_number' },
  text: '#412 · Open',
  tone: 'success',
  path: '/issues/412',
};

// A Session whose Agents and Background Tasks have all finished, so each card draws only its "N done" line.
export const onlyDoneSections = {
  subagents: { subagents: subagentStates.allFinished, now: subagentNow },
  shells: { shells: endedShells, now: shellNow, onStop: (): void => {} },
} satisfies Pick<SessionInspectorContent, 'subagents' | 'shells'>;
