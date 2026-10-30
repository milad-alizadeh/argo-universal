import type { SessionConfigOption } from '@repo/contracts';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { ComposerConfigurationProps } from './configuration-types';
import { droppedChoiceToast } from './dropped-choice-toast';

export type OptionValue = string | boolean;

// The choices made here that the Server has not reported back yet, by the option each one was made on.
export type Pending = Record<string, OptionValue>;

/*
 * How long a choice stands before the Server has confirmed it. React's own useOptimistic holds a value only
 * for the life of the action that set it, and the truth here does not come from the call that made the
 * change: it arrives later on the options subscription. So the choice is held until that subscription
 * carries it, and let go of after this, which leaves the reader looking at what the Server really has
 * rather than at a change it refused (owner, 2026-10-21).
 */
export const holdChoice = 3000;

export interface PendingChoices {
  // The choices still waiting for the Server, for a control that draws them before they land.
  pending: Pending;
  // Records a choice, then passes it on to the Server.
  choose: (configId: string, value: OptionValue) => void;
}

/*
 * The choices a control has made and the Server has not reported back. A Server that never answers used to
 * end the wait in silence: the control went on reading the value the Session already had, which is what a
 * misclick looks like (#1481). The wait now ends in a word, in the register a failed call already has.
 */
export function usePendingChoices(
  configuration: ComposerConfigurationProps,
): PendingChoices {
  const [pending, setPending] = useState<Pending>({});
  const [dropped, setDropped] = useState<readonly string[]>([]);
  const open = unconfirmed(pending, configuration.configOptions);

  if (open !== pending) setPending(open);

  useForgetChoices(open, setPending, setDropped);
  useErrorToast(droppedChoiceToast(dropped, configuration.configOptions));

  return {
    pending: open,
    choose: choosing(configuration.onConfigChange, setPending, setDropped),
  };
}

// A choice the options now carry is no longer this hook's to hold: the subscription speaks for it again.
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

// A new choice clears the last failure, so a second attempt that also fails is reported again.
const choosing =
  (
    change: ComposerConfigurationProps['onConfigChange'],
    setPending: Dispatch<SetStateAction<Pending>>,
    setDropped: Dispatch<SetStateAction<readonly string[]>>,
  ) =>
  (configId: string, value: OptionValue): void => {
    setDropped([]);
    setPending((open) => ({ ...open, [configId]: value }));
    change(configId, value);
  };

/*
 * A choice the Server never confirms is let go of after the wait, so a change it refused does not sit on the
 * screen as though it had been made, and the reader is told it did not take. Each new choice starts the wait
 * again.
 */
function useForgetChoices(
  pending: Pending,
  setPending: (pending: Pending) => void,
  setDropped: (dropped: readonly string[]) => void,
): void {
  const waiting = Object.keys(pending).length > 0;

  useEffect(() => {
    if (!waiting) return;

    const timer = setTimeout(() => {
      setDropped(Object.keys(pending));
      setPending({});
    }, holdChoice);

    return (): void => clearTimeout(timer);
  }, [waiting, pending, setPending, setDropped]);
}
