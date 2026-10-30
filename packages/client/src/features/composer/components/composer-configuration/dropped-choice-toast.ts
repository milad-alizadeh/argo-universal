import type { SessionConfigOption } from '@repo/contracts';
import type { ErrorToast } from '@repo/kit/primitives/overlays/toast';

/*
 * What the reader is told when a choice they made never came back from the Server. A change that is let go
 * of unconfirmed used to leave nothing at all: the control simply went on reading the Mode the Session was
 * already in, which is indistinguishable from a misclick (#1481). The toast is the register the App already
 * uses for a call that failed, as for a failed load; the Agent's own launch and sign-in failures are the
 * callout's.
 */
const unconfirmedMessage = 'The Server did not confirm the change.';

// Several options dropping at once, or one Argo can no longer name, is one failure of the Agent's options.
const manyTitle = "Couldn't change the Agent's options";

const optionNames = (
  dropped: readonly string[],
  options: readonly SessionConfigOption[],
): string[] =>
  dropped.flatMap((configId) => {
    const option = options.find((entry) => entry.configId === configId);

    return option ? [option.name] : [];
  });

const droppedTitle = (names: string[]): string =>
  names.length === 1 ? `Couldn't change ${names[0]}` : manyTitle;

// The error toast for choices the wait let go of before the Server reported them back; none, no toast.
export const droppedChoiceToast = (
  dropped: readonly string[],
  options: readonly SessionConfigOption[],
): ErrorToast | undefined =>
  dropped.length === 0
    ? undefined
    : {
        title: droppedTitle(optionNames(dropped, options)),
        message: unconfirmedMessage,
      };
