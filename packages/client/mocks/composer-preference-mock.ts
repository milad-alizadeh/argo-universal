import type {
  AgentInfo,
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { newSessionCatalogs } from '@repo/mocks/app';
import { draftConfiguration } from '../src/features/composer/state/session-configuration-preferences';
import { catalogCase } from './composer-preference-catalog-mock';
export const catalogCases = newSessionCatalogs.bothAvailable.map(catalogCase);
export const withoutEffortCases = catalogCases.flatMap(
  ({ withoutEffort, ...rest }) =>
    withoutEffort ? [{ ...rest, withoutEffort }] : [],
);
if (withoutEffortCases.length === 0)
  throw new Error('Recorded catalog needs a model without effort.');
export const drafted = (
  agent: AgentInfo,
  saved: Parameters<typeof draftConfiguration>[1],
): { configId: string; value: string }[] =>
  draftConfiguration(agent, saved).map((option) => ({
    configId: option.configId,
    value: option.currentValue,
  }));
export function restrictedEffort(agent: AgentInfo, level: string): AgentInfo {
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
export function accepted(
  agent: AgentInfo,
  choices: Record<string, string>,
): SessionConfigOption[] {
  return agent.configOptions.map((option) => acceptedOption(option, choices));
}
function acceptedOption(
  option: SessionConfigOption,
  choices: Record<string, string>,
): SessionConfigOption {
  if (option.type !== 'select' || !option.category) return option;
  const value = choices[option.category];
  return withAcceptedValue(option, value);
}
function withAcceptedValue(
  option: Extract<SessionConfigOption, { type: 'select' }>,
  value: string | undefined,
): SessionConfigOption {
  return value ? { ...option, currentValue: value } : option;
}
function choiceMetadata(
  choice: SessionConfigSelectOption,
): NonNullable<SessionConfigSelectOption['_meta']>['argo'] {
  return choice._meta?.argo;
}
