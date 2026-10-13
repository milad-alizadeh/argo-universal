import type {
  ConfigOptionIcon,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import type { IconName } from '#lib/generic/symbols/icon-names';
import {
  configurationChoices,
  configurationEffortChoices,
} from '../../state/configuration-choices';
import type { ComposerConfigurationProps } from './configuration-types';
type SelectConfiguration = Extract<SessionConfigOption, { type: 'select' }>;
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
export function currentEffort(configuration: ConfigurationValues): {
  option: ReturnType<typeof selection>;
  choices: SessionConfigSelectOption[];
  selected: SessionConfigSelectOption | undefined;
  // True when the Agent's value is not a level this model offers, so selected is the fallback.
  fallback: boolean;
} {
  const model = selection(configuration, 'model');
  const option = selection(configuration, 'thought_level');
  const effortChoices = configurationEffortChoices(model, option);
  const current = effortChoices.find(
    (choice) => choice.value === option?.currentValue,
  );
  return {
    option,
    choices: effortChoices,
    selected:
      current ??
      fallbackEffort(configurationChoices(option), effortChoices, option),
    fallback: !current && effortChoices.length > 0,
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
const configurationIcons: Record<string, IconName> = {
  ShieldWarning: 'permission',
  Pencil: 'edit',
  MapTrifold: 'plan-mode',
  Sparkles: 'sparkle',
  WarningTriangle: 'warning',
} satisfies Record<ConfigOptionIcon, IconName>;
export function configurationIcon(name?: string): IconName {
  return (
    (name && Object.hasOwn(configurationIcons, name)
      ? configurationIcons[name]
      : undefined) ?? 'permission'
  );
}
export function modelName(choice?: SessionConfigSelectOption): string {
  return (
    choice?._meta?.argo?.shortName ??
    choice?.name.replace(/\s*\(recommended\)\s*$/i, '') ??
    ''
  );
}
