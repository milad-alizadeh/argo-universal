import type {
  AgentServer,
  ConfigOptionIcon,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import type { IconName } from '#lib/generic/symbols/icon-names';
import {
  configurationChoices,
  currentConfigurationChoice,
  configurationEffortChoices,
} from '#lib/product/session-configuration';
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

// Configure's own rows show these categories; any other select option gets a row of its own.
const configuredCategories = new Set([
  'mode',
  'model',
  'thought_level',
  'collaboration_mode',
]);

export function otherSelections(
  configuration: ConfigurationValues,
): SelectConfiguration[] {
  return configuration.configOptions.filter(
    (option): option is SelectConfiguration =>
      option.type === 'select' &&
      !configuredCategories.has(option.category ?? ''),
  );
}

export interface EffortSelection {
  option: ReturnType<typeof selection>;
  choices: SessionConfigSelectOption[];
  selected: SessionConfigSelectOption | undefined;
  fallback: boolean;
}

export function currentEffort(
  configuration: ConfigurationValues,
): EffortSelection {
  const model = selection(configuration, 'model');
  const option = selection(configuration, 'thought_level');
  const choices = configurationEffortChoices(model, option);

  return resolveEffort(option, choices);
}

function resolveEffort(
  option: ReturnType<typeof selection>,
  choices: SessionConfigSelectOption[],
): EffortSelection {
  const current = currentConfigurationChoice(option, choices);

  return {
    option,
    choices,
    selected:
      current ?? fallbackEffort(configurationChoices(option), choices, option),
    fallback: !current && choices.length > 0,
  };
}

// Effort always has a level: the highest offered level at or below the Agent's value, else the middle one.
function fallbackEffort(
  all: SessionConfigSelectOption[],
  offered: SessionConfigSelectOption[],
  option: ReturnType<typeof selection>,
): SessionConfigSelectOption | undefined {
  const rank = all.findIndex((choice) => choice.value === option?.currentValue);

  const below =
    rank < 0
      ? []
      : offered.filter(
          (choice) => all.findIndex((c) => c.value === choice.value) < rank,
        );

  return below.at(-1) ?? offered[Math.floor(offered.length / 2)];
}

const optionIcons = {
  ShieldWarning: 'permission',
  Pencil: 'edit',
  MapTrifold: 'plan-mode',
  Sparkles: 'sparkle',
  WarningTriangle: 'warning',
} satisfies Record<ConfigOptionIcon, IconName>;

const configurationIcons = new Map(Object.entries(optionIcons));

export function configurationIcon(name?: string): IconName {
  if (!name) return 'permission';

  return configurationIcons.get(name) ?? 'permission';
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
