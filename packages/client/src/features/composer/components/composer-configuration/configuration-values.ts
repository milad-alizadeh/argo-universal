import type {
  AgentServer,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
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

/*
 * The categories Configure already draws a control of its own for; every other select option gets a plain row.
 * Shorter than the Contract's `knownCategories` on purpose: `model_config` is understood but has no control of
 * its own, so listing it here would drop such a select rather than give it a row (owner, 2026-10-20).
 */
const configuredCategories = new Set([
  'mode',
  'model',
  'thought_level',
  'collaboration_mode',
]);

/*
 * Options Configure leaves out. Claude Code sends `agent`, its own main-thread persona picker, whenever a
 * folder holds a custom Agent; it has no category, so it would land among the plain rows under the name
 * "Agent" and read as Argo's Agent, which it is not. Custom Agents are their own piece of work, and the
 * option comes back when we do them (owner, 2026-10-20).
 */
const hiddenOptions = new Set(['agent']);

const drawnElsewhere = (option: SelectConfiguration): boolean =>
  hiddenOptions.has(option.configId) ||
  configuredCategories.has(option.category ?? '');

export function otherSelections(
  configuration: ConfigurationValues,
): SelectConfiguration[] {
  return configuration.configOptions
    .filter((option): option is SelectConfiguration => option.type === 'select')
    .filter((option) => !drawnElsewhere(option));
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
