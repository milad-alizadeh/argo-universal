import type { AgentAvailability, AgentInfo } from '@repo/contracts';
import { configurationChoices } from '#lib/product/session-configuration';
import type {
  PickerOption,
  PickerOptionAction,
} from '#primitives/inputs/picker';
import type { ComposerConfigurationProps } from './configuration-types';
import { modelName, selection } from './configuration-values';

// An Agent that is not installed says so and offers no step: installing is not a choice in the list.
const agentAvailability = {
  not_signed_in: {
    label: 'Not signed in',
    button: 'Sign in',
    action: 'setup',
    reason: false,
  },
  not_installed: {
    label: 'Not installed',
    button: undefined,
    action: 'setup',
    reason: false,
  },
  unavailable: {
    label: 'Unavailable',
    button: 'Retry',
    action: 'retry',
    reason: true,
  },
} satisfies Record<
  Exclude<AgentAvailability, 'available'>,
  {
    label: string;
    button: string | undefined;
    action: 'setup' | 'retry';
    reason: boolean;
  }
>;

// Each Agent as a Picker option: one that is not ready says why and offers its next step.
export function agentOptions(
  configuration: ComposerConfigurationProps,
): PickerOption<string>[] {
  return configuration.agents.map((agent) => ({
    value: agent.agent,
    label: agent.label,
    accessibilityLabel: `Select ${agent.label}`,
    disabled:
      !configuration.onAgentChange || agent.availability !== 'available',
    supporting: agentStatus(agent),
    action: agentAction(agent, configuration),
  }));
}

function agentStatus(agent: AgentInfo): string | undefined {
  if (agent.availability === 'available') return undefined;
  const unavailable = agentAvailability[agent.availability];

  return [unavailable.label, unavailable.reason && agent.installStep]
    .filter(Boolean)
    .join(' · ');
}

function agentAction(
  agent: AgentInfo,
  configuration: ComposerConfigurationProps,
): PickerOptionAction | undefined {
  if (agent.availability === 'available') return undefined;
  const onPress = agentActionPress(agent, configuration);

  return onPress && unavailableAction(agent, agent.availability, onPress);
}

function unavailableAction(
  agent: AgentInfo,
  availability: Exclude<AgentAvailability, 'available'>,
  onPress: () => void,
): PickerOptionAction | undefined {
  const unavailable = agentAvailability[availability];
  const verb = unavailable.action === 'retry' ? 'Retry' : 'Set up';

  if (!unavailable.button) return undefined;

  return {
    label: unavailable.button,
    accessibilityLabel: `${verb} ${agent.label}`,
    onPress,
  };
}

function agentActionPress(
  agent: AgentInfo,
  configuration: ComposerConfigurationProps,
): (() => void) | undefined {
  if (agent.availability === 'unavailable') return configuration.onAgentRetry;

  const setup = configuration.onAgentSetup;

  return setup ? () => setup(agent.agent) : undefined;
}

// The Agent's models as Picker options, or none when it offers no choice.
export function modelOptions(
  configuration: ComposerConfigurationProps,
): PickerOption<string>[] {
  return configurationChoices(selection(configuration, 'model')).map(
    (choice) => ({
      value: choice.value,
      label: modelName(choice),
      accessibilityLabel: choice.name,
      supporting: choice.description ?? undefined,
    }),
  );
}
