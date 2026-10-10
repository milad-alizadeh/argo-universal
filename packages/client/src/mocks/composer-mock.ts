import type {
  AgentInfo,
  PlanEntry,
  SessionConfigOption,
} from '@repo/contracts';
import {
  newSessionBranches,
  newSessionCatalogs,
  newSessionInputs,
  newSessionOptions,
} from '@repo/mocks/app';
import {
  type ComposerImage,
  type ComposerProps,
} from '../features/composer/components/composer';

const imageUri =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nGN4piFHU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULANahsD1zXuJAAAAAAElFTkSuQmCC';

export const composerLongAgentCatalog: AgentInfo[] = Array.from(
  { length: 40 },
  (_, index) => {
    const agent = newSessionCatalogs.bothAvailable[0];
    if (!agent) throw new Error('Composer needs an available Agent mock.');
    return {
      ...agent,
      agent: `development-agent-${index + 1}`,
      label: `Agent ${String(index + 1).padStart(2, '0')}`,
    };
  },
);

export const composerImages: ComposerImage[] = newSessionInputs.flatMap(
  ({ agent, prompt }) =>
    prompt.flatMap((block) =>
      block.type === 'image'
        ? [
            {
              id: `${agent}:image`,
              name: 'screenshot.png',
              uri: imageUri,
              bytes: block.blob.bytes,
            },
          ]
        : [],
    ),
);

const imageFromContract = composerImages[0];
if (!imageFromContract)
  throw new Error('New Session contract mock needs an image.');
export const oversizedComposerImage: ComposerImage = {
  ...imageFromContract,
  name: 'full-screen.png',
  bytes: 27 * 1024 * 1024,
};

export const composerPlan: PlanEntry[] = [
  {
    content: 'Inspect the Composer layout',
    priority: 'high',
    status: 'completed',
  },
  {
    content: 'Update the shared controls',
    priority: 'high',
    status: 'in_progress',
  },
  {
    content: 'Verify phone and desktop',
    priority: 'medium',
    status: 'pending',
  },
];

export const composerPlanDone: PlanEntry[] = composerPlan.map((entry) => ({
  ...entry,
  status: 'completed',
}));

export const composerUnlistedEffortConfigurations =
  newSessionCatalogs.bothAvailable.map(
    (agent): NonNullable<ComposerProps['configuration']> => ({
      agents: newSessionCatalogs.bothAvailable,
      agent: agent.agent,
      configOptions: agent.configOptions.map((option) =>
        option.category === 'thought_level' && option.type === 'select'
          ? { ...option, currentValue: 'unsupported' }
          : option,
      ),
      onConfigChange: () => {},
      checkout: { branch: 'main', newWorktree: false },
    }),
  );

export const composerUnavailableConfigurations =
  newSessionCatalogs.bothUnavailable.map(
    (agent): NonNullable<ComposerProps['configuration']> => ({
      agents: newSessionCatalogs.bothUnavailable,
      agent: agent.agent,
      configOptions: agent.configOptions,
      onConfigChange: () => {},
      checkout: { branch: 'main', newWorktree: false },
    }),
  );

export type ComposerMockProps = ComposerProps & {
  initialAgent?: AgentInfo['agent'];
  sessionStarted?: boolean;
  running?: boolean;
  plan?: PlanEntry[];
};

export function composerProps(props: ComposerMockProps): ComposerProps {
  const agent =
    props.initialAgent ?? newSessionCatalogs.bothAvailable[0]?.agent ?? '';
  const catalog = newSessionOptions.find((entry) => entry.agent === agent);
  return {
    ...props,
    onAttachCamera: props.onAttachCamera ?? props.onAttachImages,
    status: props.status ?? {
      usage: {
        limits: [
          {
            label: '5-hour limit',
            usedPercent: 54,
            resets: 'Resets in 2h 14m',
          },
          {
            label: 'Weekly limit',
            usedPercent: 31,
            resets: 'Resets Thursday at 09:00',
          },
        ],
      },
      ...(props.sessionStarted
        ? {
            plan: props.plan ?? composerPlan,
            subagents: { count: 2, running: true, onPress: () => {} },
            shells: { count: 1, running: false, onPress: () => {} },
            context: { used: 34_000, size: 200_000, onCompact: () => {} },
          }
        : {}),
    },
    configuration: props.configuration ?? {
      agents: newSessionCatalogs.bothAvailable,
      agent,
      configOptions: catalog?.configOptions ?? [],
      turnRunning: props.running ?? false,
      onAgentChange: props.sessionStarted ? undefined : () => {},
      onConfigChange: () => {},
      checkout: {
        branch: newSessionBranches.currentBranch ?? 'main',
        newWorktree: true,
        onNewWorktreeChange: props.sessionStarted ? undefined : () => {},
        ...(props.sessionStarted
          ? { path: '/Developer/project/.worktrees/session' }
          : {}),
      },
    },
  };
}

const longModelAgent = newSessionCatalogs.bothAvailable[0];
const longModelOption = longModelAgent?.configOptions.find(
  (option) => option.category === 'model' && option.type === 'select',
);
const longModelTemplate =
  longModelOption?.type === 'select'
    ? longModelOption.options.flatMap((entry) =>
        'groupId' in entry ? entry.options : [entry],
      )[0]
    : undefined;
if (!longModelAgent || longModelOption?.type !== 'select' || !longModelTemplate)
  throw new Error('Recorded catalog needs an Agent with a model choice.');

export const composerLongModelList = Array.from({ length: 24 }, (_, index) => ({
  ...longModelTemplate,
  value: `development-model-${index + 1}`,
  name: `Model ${String(index + 1).padStart(2, '0')}`,
  description: 'Best for everyday, complex tasks',
  _meta: undefined,
}));

// More Agents and models than the desktop menu shows at once, so both lists scroll.
export const composerLongListConfiguration: NonNullable<
  ComposerProps['configuration']
> = {
  agents: [longModelAgent, ...composerLongAgentCatalog],
  agent: longModelAgent.agent,
  configOptions: longModelAgent.configOptions.map((option) =>
    option.configId === longModelOption.configId && option.type === 'select'
      ? {
          ...option,
          currentValue: 'development-model-1',
          options: composerLongModelList,
        }
      : option,
  ),
  onAgentChange: () => {},
  onConfigChange: () => {},
  checkout: { branch: 'main', newWorktree: false },
};

function firstAvailableAgent(): AgentInfo {
  const agent = newSessionCatalogs.bothAvailable[0];
  if (!agent) throw new Error('Recorded catalog needs an available Agent.');
  return agent;
}
const fastModeAgent = firstAvailableAgent();
// No adapter offers Fast mode yet, so this on/off option stands in until one is recorded.
export function composerFastModeConfiguration(
  on: boolean,
): NonNullable<ComposerProps['configuration']> {
  return {
    agents: newSessionCatalogs.bothAvailable,
    agent: fastModeAgent.agent,
    configOptions: [
      ...fastModeAgent.configOptions,
      {
        type: 'boolean',
        configId: 'fast',
        name: 'Fast mode',
        description: 'Quicker replies, at a higher cost',
        currentValue: on,
      },
    ],
    onConfigChange: () => {},
    checkout: { branch: 'main', newWorktree: false },
  };
}

export const composerSettingsOptions: SessionConfigOption[] = [
  { configId: 'fast', name: 'Fast mode', type: 'boolean', currentValue: false },
  {
    configId: 'response-style',
    name: 'Response style',
    type: 'select',
    currentValue: 'concise',
    options: [
      { value: 'concise', name: 'Concise' },
      { value: 'detailed', name: 'Detailed' },
    ],
  },
];
export const composerLongSettingsOptions: SessionConfigOption[] = [
  ...composerSettingsOptions,
  {
    configId: 'profile',
    name: 'Profile',
    type: 'select',
    currentValue: 'profile-1',
    options: Array.from({ length: 40 }, (_, index) => ({
      value: `profile-${index + 1}`,
      name: `Profile ${index + 1}`,
    })),
  },
];

export function updateComposerSettings(
  options: SessionConfigOption[],
  configId: string,
  value: string | boolean,
): SessionConfigOption[] {
  return options.map((option) => {
    if (option.configId !== configId) return option;
    if (option.type === 'boolean' && typeof value === 'boolean')
      return { ...option, currentValue: value };
    if (option.type === 'select' && typeof value === 'string')
      return { ...option, currentValue: value };
    return option;
  });
}
