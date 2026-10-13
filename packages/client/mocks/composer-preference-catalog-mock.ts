import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import type { newSessionOptions } from '@repo/mocks/app';

export type RecordedSession = (typeof newSessionOptions)[number];

type SelectOption = Extract<SessionConfigOption, { type: 'select' }>;

interface CatalogBasics {
  agent: RecordedSession;
  model: SelectOption;
  effort: SelectOption;
  mode: SelectOption;
}

interface EffortFacts {
  narrower: SessionConfigSelectOption;
  unsupported: string;
  chosenEffort: string;
}

interface CatalogCase extends CatalogBasics, EffortFacts {
  otherMode: SessionConfigSelectOption;
  defaultMode: { configId: string; value: string };
  withoutEffort: SessionConfigSelectOption | undefined;
}

export function catalogCase(agent: RecordedSession): CatalogCase {
  const model = select(agent, 'model');
  const effort = select(agent, 'thought_level');
  const mode = select(agent, 'mode');
  const basics = { agent, model, effort, mode };

  return {
    ...basics,
    ...effortFacts(basics),
    ...modeFacts(basics),
    withoutEffort: choicesOf(model).find(noEffort),
  };
}

function select(agent: RecordedSession, category: string): SelectOption {
  const option = agent.configOptions.find(
    (entry): entry is SelectOption =>
      entry.type === 'select' && entry.category === category,
  );

  if (!option)
    throw new Error(
      `Recorded Session needs ${category} options for ${agent.agent}.`,
    );

  return option;
}

function choicesOf(option: SelectOption): SessionConfigSelectOption[] {
  return option.options.flatMap((entry) =>
    'groupId' in entry ? entry.options : [entry],
  );
}

function metadata(
  choice: SessionConfigSelectOption,
):
  | NonNullable<NonNullable<SessionConfigSelectOption['_meta']>['argo']>
  | undefined {
  return choice._meta?.argo;
}

function levelsOf(choice: SessionConfigSelectOption): string[] {
  return metadata(choice)?.supportedEffortLevels ?? [];
}

function noEffort(choice: SessionConfigSelectOption): boolean {
  return metadata(choice)?.supportsEffort === false;
}

function offersEffort(choice: SessionConfigSelectOption): boolean {
  return !!metadata(choice)?.supportsEffort;
}

function fewerLevels(
  choice: SessionConfigSelectOption,
  defaultModel: SessionConfigSelectOption,
  effort: SelectOption,
): boolean {
  return (
    offersEffort(choice) &&
    levelsOf(choice).includes(effort.currentValue) &&
    levelsOf(defaultModel).some((level) => !levelsOf(choice).includes(level))
  );
}

function needed<Value>(value: Value | undefined, label: string): Value {
  if (!value)
    throw new Error(
      `Recorded Session needs two modes, a default effort and models with differing effort levels for ${label}.`,
    );

  return value;
}

function effortFacts(basics: CatalogBasics): EffortFacts {
  const { agent, model, effort } = basics;
  const models = choicesOf(model);
  const defaultModel = defaultChoice(models, model, agent.agent);
  const narrower = narrowerChoice(models, defaultModel, basics);

  const unsupported = needed(
    levelsOf(defaultModel).find((level) => !levelsOf(narrower).includes(level)),
    agent.agent,
  );

  const chosenEffort = needed(
    levelsOf(narrower).find((level) => level !== effort.currentValue),
    agent.agent,
  );

  return { narrower, unsupported, chosenEffort };
}

function modeFacts({
  agent,
  mode,
}: CatalogBasics): Pick<CatalogCase, 'otherMode' | 'defaultMode'> {
  return {
    otherMode: needed(
      choicesOf(mode).find((choice) => choice.value !== mode.currentValue),
      agent.agent,
    ),
    defaultMode: { configId: mode.configId, value: mode.currentValue },
  };
}

function defaultChoice(
  models: SessionConfigSelectOption[],
  model: SelectOption,
  label: string,
): SessionConfigSelectOption {
  return needed(
    models.find((choice) => choice.value === model.currentValue),
    label,
  );
}

function narrowerChoice(
  models: SessionConfigSelectOption[],
  defaultModel: SessionConfigSelectOption,
  { agent, effort }: CatalogBasics,
): SessionConfigSelectOption {
  return needed(
    models.find((choice) => fewerLevels(choice, defaultModel, effort)),
    agent.agent,
  );
}
