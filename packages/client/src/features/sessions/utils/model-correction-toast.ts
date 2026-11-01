import {
  configurationChoices,
  isModelOption,
  type InitialConfigOption,
  type SessionConfigOption,
} from '@repo/contracts';
import type { ErrorToast } from '@repo/kit/primitives/overlays/toast';

type SelectOption = Extract<SessionConfigOption, { type: 'select' }>;

const choiceName = (option: SelectOption, value: string): string =>
  configurationChoices(option).find((choice) => choice.value === value)?.name ??
  value;

const isPicked = (sent: InitialConfigOption): boolean => !sent.optional;

const sentFor = (
  initial: readonly InitialConfigOption[],
  option: SelectOption,
): InitialConfigOption | undefined =>
  initial.find(
    (entry) => entry.configId === option.configId && isPicked(entry),
  );

const toast = (option: SelectOption, chosen: string): ErrorToast => ({
  title: `The Agent changed the ${option.name}`,
  message: `It runs ${choiceName(option, option.currentValue)} instead of ${choiceName(option, chosen)}.`,
});

const isModelSelect = (option: SessionConfigOption): option is SelectOption =>
  option.type === 'select' && isModelOption(option);

const differs = (sent: InitialConfigOption, option: SelectOption): boolean =>
  sent.value !== option.currentValue;

const correction = (
  initial: readonly InitialConfigOption[],
  option: SelectOption,
): ErrorToast | undefined => {
  const sent = sentFor(initial, option);

  return sent && differs(sent, option)
    ? toast(option, String(sent.value))
    : undefined;
};

/*
 * The Agent's own correction of the model the reader chose in New Session: the Session's options name a
 * model other than the one sent. Argo predicts nothing; it passes on what the Agent reports (#1692).
 */
export const modelCorrectionToast = (
  initial: readonly InitialConfigOption[],
  live: readonly SessionConfigOption[],
): ErrorToast | undefined => {
  const option = live.find(isModelSelect);

  return option && correction(initial, option);
};
