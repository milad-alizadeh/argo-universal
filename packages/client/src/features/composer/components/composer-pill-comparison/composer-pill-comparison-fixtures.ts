import { defaultEffortConfiguration } from '../composer-configuration/composer-configuration-fixtures';
import { runningPlan } from '../composer-status/composer-plan-fixtures';
import { runningWork } from '../composer-status/composer-status-fixtures';
import { smartZoneContext } from '../composer-status/context-control-fixtures';
import type { ComposerPillComparisonProps } from './composer-pill-comparison.mocks';

export const sharedControls = {
  configuration: defaultEffortConfiguration.configuration,
  status: {
    ...runningWork.status,
    context: smartZoneContext.context,
    usage: {
      limits: [
        { label: '5-hour limit', usedPercent: 54, resets: 'Resets in 2h 14m' },
      ],
    },
  },
  entries: runningPlan.entries,
  disabled: false,
} satisfies ComposerPillComparisonProps;
