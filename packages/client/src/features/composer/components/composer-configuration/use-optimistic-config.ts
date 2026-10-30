import type { SessionConfigOption } from '@repo/contracts';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  usePendingChoices,
  type OptionValue,
  type Pending,
} from './use-pending-choices';

type SelectConfiguration = Extract<SessionConfigOption, { type: 'select' }>;

type BooleanConfiguration = Extract<SessionConfigOption, { type: 'boolean' }>;

/*
 * The configuration as the reader last left it. A switch and the Composer's trigger both draw straight from
 * the options the Server sends, so flipping Fast mode moved nothing until the round trip came back, a third
 * of a second later; the choice now shows at once and the Server's answer takes it over (owner, 2026-10-21).
 * How long a choice stands, and what is said when the Server never confirms it, belong to the choices
 * themselves (`use-pending-choices.ts`).
 */
export function useOptimisticConfig(
  configuration: ComposerConfigurationProps,
): ComposerConfigurationProps {
  const { pending, choose } = usePendingChoices(configuration);

  return {
    ...configuration,
    configOptions: shownOptions(configuration.configOptions, pending),
    onConfigChange: choose,
  };
}

function shownOptions(
  options: SessionConfigOption[],
  pending: Pending,
): SessionConfigOption[] {
  if (Object.keys(pending).length === 0) return options;

  return options.map((option) => shownOption(option, pending[option.configId]));
}

// A kind's own value is the only one that stands in for it, so neither branch has anything to assert.
const shownOption = (
  option: SessionConfigOption,
  value: OptionValue | undefined,
): SessionConfigOption =>
  option.type === 'boolean'
    ? shownSwitch(option, value)
    : shownSelect(option, value);

const shownSwitch = (
  option: BooleanConfiguration,
  value: OptionValue | undefined,
): BooleanConfiguration =>
  typeof value === 'boolean' ? { ...option, currentValue: value } : option;

const shownSelect = (
  option: SelectConfiguration,
  value: OptionValue | undefined,
): SelectConfiguration =>
  typeof value === 'string' ? { ...option, currentValue: value } : option;
