import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { newSessionOptions } from '@repo/mocks/app';
import { draftConfiguration } from '../src/lib/product/session-configuration';
import {
  catalogCase,
  type RecordedSession,
} from './composer-preference-catalog-mock';

export const catalogCases = newSessionOptions.map(catalogCase);

export const withoutEffortCases = catalogCases.flatMap(
  ({ withoutEffort, ...rest }) =>
    withoutEffort ? [{ ...rest, withoutEffort }] : [],
);

if (withoutEffortCases.length === 0)
  throw new Error('Recorded catalog needs a model without effort.');

export const drafted = (
  agent: RecordedSession,
  saved: Parameters<typeof draftConfiguration>[1],
): { configId: string; value: string }[] =>
  draftConfiguration(agent.configOptions, saved).map((option) => ({
    configId: option.configId,
    value: option.currentValue,
  }));

export function restrictedEffort(
  agent: RecordedSession,
  level: string,
): RecordedSession {
  const restricted = structuredClone(agent);
  const models = restricted.configOptions.filter(isModel).flatMap(choicesOf);

  for (const choice of models) restrictChoice(choice, level);

  return restricted;
}

function isModel(
  option: SessionConfigOption,
): option is Extract<SessionConfigOption, { type: 'select' }> {
  return option.type === 'select' && option.category === 'model';
}

function choicesOf(
  option: Extract<SessionConfigOption, { type: 'select' }>,
): SessionConfigSelectOption[] {
  return option.options.flatMap((entry) =>
    'groupId' in entry ? entry.options : [entry],
  );
}

function restrictChoice(
  choice: SessionConfigSelectOption,
  level: string,
): void {
  const metadata = choiceMetadata(choice);

  if (!metadata) return;

  if (metadata.supportsEffort) metadata.supportedEffortLevels = [level];
}

function choiceMetadata(
  choice: SessionConfigSelectOption,
): NonNullable<SessionConfigSelectOption['_meta']>['argo'] {
  return choice._meta?.argo;
}
