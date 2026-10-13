import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';

export function recordedFlat(
  option?: SessionConfigOption,
): SessionConfigSelectOption[] {
  return option?.type === 'select'
    ? option.options.flatMap((entry) =>
        'groupId' in entry ? entry.options : [entry],
      )
    : [];
}

export function recordedLevels(
  choices: SessionConfigSelectOption[],
  currentValue?: string | boolean,
): string[] | undefined {
  const current = choices.find((entry) => entry.value === currentValue);

  return recordedMetadata(current)?.supportedEffortLevels;
}

export function recordedMetadata(
  choice?: SessionConfigSelectOption,
):
  | NonNullable<NonNullable<SessionConfigSelectOption['_meta']>['argo']>
  | undefined {
  if (!choice) return undefined;

  return choice._meta?.argo;
}
