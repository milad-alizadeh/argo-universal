import type { SessionConfigOption } from '@repo/contracts';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { ComposerConfigurationProps } from './configuration-types';

type OptionValue = string | boolean;

type SelectConfiguration = Extract<SessionConfigOption, { type: 'select' }>;

type BooleanConfiguration = Extract<SessionConfigOption, { type: 'boolean' }>;

// The choices made here that the Server has not reported back yet, by the option each one was made on.
type Pending = Record<string, OptionValue>;

/*
 * How long a choice stands before the Server has confirmed it. React's own useOptimistic holds a value only
 * for the life of the action that set it, and the truth here does not come from the call that made the
 * change: it arrives later on the options subscription. So the choice is held until that subscription
 * carries it, and let go of after this, which leaves the reader looking at what the Server really has
 * rather than at a change it refused (owner, 2026-10-21).
 */
const holdChoice = 3000;

/*
 * The configuration as the reader last left it. A switch and the Composer's trigger both draw straight from
 * the options the Server sends, so flipping Fast mode moved nothing until the round trip came back, a third
 * of a second later; the choice now shows at once and the Server's answer takes it over (owner, 2026-10-21).
 */
export function useOptimisticConfig(
  configuration: ComposerConfigurationProps,
): ComposerConfigurationProps {
  const [pending, setPending] = useState<Pending>({});
  const open = unconfirmed(pending, configuration.configOptions);

  if (open !== pending) setPending(open);

  useForgetChoices(open, setPending);

  return {
    ...configuration,
    configOptions: shownOptions(configuration.configOptions, open),
    onConfigChange: choosing(configuration.onConfigChange, setPending),
  };
}

// A choice the options now carry is no longer this hook's to show: the subscription speaks for it again.
function unconfirmed(
  pending: Pending,
  options: SessionConfigOption[],
): Pending {
  const waiting = Object.entries(pending).filter(
    ([configId, value]) => optionValue(options, configId) !== value,
  );

  return waiting.length === Object.keys(pending).length
    ? pending
    : Object.fromEntries(waiting);
}

const optionValue = (
  options: SessionConfigOption[],
  configId: string,
): OptionValue | undefined =>
  options.find((option) => option.configId === configId)?.currentValue;

const choosing =
  (
    change: ComposerConfigurationProps['onConfigChange'],
    setPending: Dispatch<SetStateAction<Pending>>,
  ) =>
  (configId: string, value: OptionValue): void => {
    setPending((open) => ({ ...open, [configId]: value }));
    change(configId, value);
  };

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

/*
 * A choice the Server never confirms is let go of after the wait, so a change it refused does not sit on the
 * screen as though it had been made. Each new choice starts the wait again.
 */
function useForgetChoices(
  pending: Pending,
  setPending: (pending: Pending) => void,
): void {
  const waiting = Object.keys(pending).length > 0;

  useEffect(() => {
    if (!waiting) return;

    const timer = setTimeout(() => setPending({}), holdChoice);

    return (): void => clearTimeout(timer);
  }, [waiting, pending, setPending]);
}
