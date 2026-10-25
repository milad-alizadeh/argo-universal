import {
  currentConfigurationChoice,
  effortSelection,
  hasOwnControl,
  type AgentServer,
  type EffortSelection,
  type SessionConfigOption,
  type SessionConfigSelectOption,
} from '@repo/contracts';
import type { ComposerConfigurationProps } from './configuration-types';

export type SelectConfiguration = Extract<
  SessionConfigOption,
  { type: 'select' }
>;

type BooleanConfiguration = Extract<SessionConfigOption, { type: 'boolean' }>;

type ConfigurationValues = Pick<ComposerConfigurationProps, 'configOptions'>;

export function switches(
  configuration: ConfigurationValues,
): BooleanConfiguration[] {
  return configuration.configOptions.filter(
    (option): option is BooleanConfiguration => option.type === 'boolean',
  );
}

export function selection(
  configuration: ConfigurationValues,
  category: string,
): SelectConfiguration | undefined {
  return configuration.configOptions.find(
    (option): option is SelectConfiguration =>
      option.type === 'select' && option.category === category,
  );
}

export function otherSelections(
  configuration: ConfigurationValues,
): SelectConfiguration[] {
  return configuration.configOptions
    .filter((option): option is SelectConfiguration => option.type === 'select')
    .filter((option) => !hasOwnControl(option));
}

export const currentEffort = (
  configuration: ConfigurationValues,
): EffortSelection => effortSelection(configuration.configOptions);

/*
 * Whether the Agent's settings are still on their way: a chosen Agent that has sent nothing. The picker draws
 * its rows as bars while this holds, and the Agent list keeps the reader until it lifts.
 */
export function loadingConfiguration(
  configuration: ComposerConfigurationProps,
): boolean {
  return !!configuration.opening && !configuration.configOptions.length;
}

// The Agent's name; without an installed Agent, the fallback a surface shows instead.
export function agentName(agent?: AgentServer, fallback = ''): string {
  return agent ? agent.name : fallback;
}

export function modelName(choice?: SessionConfigSelectOption): string {
  if (!choice) return '';

  return shortModelName(choice) ?? configurationLabel(choice.name);
}

export function configurationLabel(name: string): string {
  const trimmed = name.trimEnd();
  const suffix = '(recommended)';

  return trimmed.toLowerCase().endsWith(suffix)
    ? trimmed.slice(0, -suffix.length).trimEnd()
    : name;
}

export function selectedChoice(
  configuration: ConfigurationValues,
  category: string,
): SessionConfigSelectOption | undefined {
  return currentConfigurationChoice(selection(configuration, category));
}

export function choiceMetadata(
  choice: SessionConfigSelectOption,
):
  | NonNullable<NonNullable<SessionConfigSelectOption['_meta']>['argo']>
  | undefined {
  return choice._meta?.argo;
}

export function isDangerous(choice?: SessionConfigSelectOption): boolean {
  return choice ? choiceMetadata(choice)?.tone === 'dangerous' : false;
}

function shortModelName(choice: SessionConfigSelectOption): string | undefined {
  return choiceMetadata(choice)?.shortName;
}

export function checkoutName(
  checkout: ComposerConfigurationProps['checkout'],
): string {
  if (!checkout.newWorktree) return 'Local';

  return checkoutBasename(checkout.path) || checkout.branch.toLowerCase();
}

function checkoutBasename(path?: string): string | undefined {
  return path?.split(/[\\/]/).findLast((part) => part !== '');
}

export function isFastMode(option: SessionConfigOption): boolean {
  return option.configId === 'fast' || option.configId === 'fast-mode';
}
