import type {
  AgentServer,
  PlanEntry,
  SessionConfigOption,
} from '@repo/contracts';
import {
  newSessionBranches,
  newSessionCatalogs,
  newSessionOptions,
} from '@repo/mocks/app';
import type { ComposerProps } from '../src/features/composer/components/composer/composer';
import { composerPlan } from './composer-attachments';

export {
  composerImages,
  composerImage,
  oversizedComposerImage,
  composerFiles,
  composerTextFile,
  composerOtherFile,
  composerPlan,
  composerPlanDone,
} from './composer-attachments';

export {
  composerUnlistedEffortConfigurations,
  composerUnlistedEffortConfiguration,
} from './composer-agent-catalogs';

export {
  composerLongModelList,
  composerLongListConfiguration,
  composerFastModeConfiguration,
} from './composer-model-catalogs';

export {
  composerSettingsOptions,
  composerLongSettingsOptions,
  updateComposerSettings,
} from './composer-settings';

export type ComposerMockProps = ComposerProps & {
  initialAgent?: AgentServer['id'];
  sessionStarted?: boolean;
  // A started Session's worktree, named by its folder and branch; `session` when unset.
  worktree?: string;
  running?: boolean;
  plan?: PlanEntry[];
};

export function composerProps(props: ComposerMockProps): ComposerProps {
  return {
    ...props,
    onAttachCamera: cameraCallback(props),
    status: props.status ?? defaultStatus(props),
    configuration: props.configuration ?? defaultConfiguration(props),
  };
}

function usage(): NonNullable<NonNullable<ComposerProps['status']>['usage']> {
  return {
    limits: [
      { label: '5-hour limit', usedPercent: 54, resets: 'Resets in 2h 14m' },
      {
        label: 'Weekly limit',
        usedPercent: 31,
        resets: 'Resets Thursday at 09:00',
      },
    ],
  };
}

function defaultStatus(
  props: Pick<ComposerMockProps, 'plan' | 'sessionStarted'>,
): ComposerProps['status'] {
  const status = { usage: usage() };

  return props.sessionStarted ? { ...status, ...sessionStatus(props) } : status;
}

function sessionStatus(
  props: Pick<ComposerMockProps, 'plan'>,
): ComposerProps['status'] {
  return {
    plan: props.plan ?? composerPlan,
    subagents: { count: 2, running: true, onPress: () => {} },
    shells: { count: 1, running: false, onPress: () => {} },
    context: { used: 34_000, size: 200_000, onCompact: () => {} },
  };
}

function defaultConfiguration(
  props: Pick<
    ComposerMockProps,
    'initialAgent' | 'running' | 'sessionStarted' | 'worktree'
  >,
): ComposerProps['configuration'] {
  const agent = props.initialAgent ?? availableAgent();

  return {
    agent: installedAgent(agent),
    configOptions: recordedOptions(agent),
    turnRunning: props.running ?? false,
    onConfigChange: (): void => {},
    checkout: checkout(props.sessionStarted, props.worktree),
  };
}

function availableAgent(): string {
  return newSessionCatalogs.bothAvailable[0]?.id ?? '';
}

// The mock's Installed Agent with that id; stories pass a recording's Agent through installedAgentOf.
function installedAgent(id: string): AgentServer | undefined {
  return newSessionCatalogs.bothAvailable.find((entry) => entry.id === id);
}

type Configuration = NonNullable<ComposerProps['configuration']>;

function checkout(
  sessionStarted: boolean | undefined,
  name: string | undefined,
): Configuration['checkout'] {
  if (sessionStarted) return startedCheckout(name);

  return {
    branch: currentBranch(),
    newWorktree: true,
    onNewWorktreeChange: (): void => {},
  };
}

function startedCheckout(name: string | undefined): Configuration['checkout'] {
  return {
    branch: name ?? currentBranch(),
    newWorktree: true,
    path: `/Developer/project/.worktrees/${name ?? 'session'}`,
  };
}

function cameraCallback(
  props: Pick<ComposerMockProps, 'onAttachCamera' | 'onAttachImages'>,
): ComposerProps['onAttachCamera'] {
  return props.onAttachCamera ?? props.onAttachImages;
}

function recordedOptions(agent: string): SessionConfigOption[] {
  return (
    newSessionOptions.find((entry) => entry.agent === agent)?.configOptions ??
    []
  );
}

function currentBranch(): string {
  return newSessionBranches.currentBranch ?? 'main';
}
