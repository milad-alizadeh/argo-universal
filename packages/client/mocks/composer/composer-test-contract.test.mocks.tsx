import {
  type AgentServer,
  type SessionConfigSelectOption,
} from '@repo/contracts';

export const missingAvailableAgentFailure =
  'Recorded catalog needs an available Agent.';

export const agentModelLabel = 'Agent and model';

export const newCheckoutLabel = 'New worktree';

export const agentIconId = 'composer-agent-icon';

export const spacingPrompt = 'Match the spacing.';

export const multilineSpacingPrompt =
  'Match the spacing.\nKeep the phone readable.\nUse both themes.';

export const chooseAgentLabel = /^Agent,/;

export const typedLines = (text: string): string =>
  text.replaceAll('\n', '{Shift>}{Enter}{/Shift}');

export const readOnlyAttribute = 'aria-readonly';

export const chooseModelLabel = /^Model,/;

export const expandedAttribute = 'aria-expanded';

export const subagentCountLabel = 'Agents: 2';

export const contextWindowLabel = 'Context window';

export const runningPlanStepLabel = 'Update the shared controls in progress';

export const planTitle = 'Verify phone and desktop';

export const planStepsId = 'composer-plan-steps';

export type PickerCatalog = {
  agent: AgentServer;
  models: SessionConfigSelectOption[];
  currentEffort: string;
  highEffortModel: SessionConfigSelectOption;
  highEffortLevels: string[];
  highEffort: string;
  planning: SessionConfigSelectOption;
  dangerous: SessionConfigSelectOption;
};
