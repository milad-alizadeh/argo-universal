import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from './set-config-option';

type SelectOption = Extract<SessionConfigOption, { type: 'select' }>;

type Classified = Pick<SessionConfigOption, 'category' | 'configId'>;

/*
 * The model, effort and mode a new Session starts with, in the order it sends them: the model first, because its
 * ACP response defines which effort levels and modes remain. `thought_level` is ACP's name for effort.
 */
export const startingCategories = ['model', 'thought_level', 'mode'] as const;

export type StartingCategory = (typeof startingCategories)[number];

/*
 * Every category Argo draws something for, which is the ACP spec's four plus the ones real Agents send beside
 * them: `collaboration_mode` is codex-acp's own, outside the spec but handled, so it is not a surprise (owner,
 * 2026-10-20).
 */
export const knownCategories: ReadonlySet<string> = new Set([
  ...startingCategories,
  'model_config',
  'collaboration_mode',
]);

/*
 * The categories Configure already draws a control of its own for; every other select option gets a plain row.
 * Shorter than `knownCategories` on purpose: `model_config` is understood but has no control of its own, so
 * listing it here would drop such a select rather than give it a row (owner, 2026-10-20).
 */
const ownControlCategories: ReadonlySet<string> = new Set([
  ...startingCategories,
  'collaboration_mode',
]);

/*
 * Options Configure leaves out. Claude Code sends `agent`, its own main-thread persona picker, whenever a
 * folder holds a custom Agent; it has no category, so it would land among the plain rows under the name
 * "Agent" and read as Argo's Agent, which it is not. Custom Agents are their own piece of work, and the
 * option comes back when we do them (owner, 2026-10-20).
 */
const hiddenOptions: ReadonlySet<string> = new Set(['agent']);

export const isModelOption = (option: Classified): boolean =>
  option.category === 'model';

// Which of the model, effort and mode an option is, if any.
export function startingCategory(
  option: Classified,
): StartingCategory | undefined {
  return startingCategories.find((category) => category === option.category);
}

// Whether Configure leaves the select to a control of its own, or hides it, so it gets no plain row.
export const hasOwnControl = (option: Classified): boolean =>
  hiddenOptions.has(option.configId) ||
  ownControlCategories.has(option.category ?? '');

// Where an option goes when a new Session sends its choices; options outside the three keep their place after them.
export function startingRank(option: Classified): number {
  const index = startingCategories.findIndex(
    (category) => category === option.category,
  );

  return index < 0 ? startingCategories.length : index;
}

// A select option's choices, with its groups flattened.
export function configurationChoices(
  option?: SelectOption,
): SessionConfigSelectOption[] {
  return (
    option?.options.flatMap((entry) =>
      'groupId' in entry ? entry.options : [entry],
    ) ?? []
  );
}

export function currentConfigurationChoice(
  option?: SelectOption,
  choices: SessionConfigSelectOption[] = configurationChoices(option),
): SessionConfigSelectOption | undefined {
  return choices.find((choice) => choice.value === option?.currentValue);
}

type ModelMetadata = NonNullable<
  NonNullable<SessionConfigSelectOption['_meta']>['argo']
>;

const offeredIn = (
  option: SelectOption | undefined,
  levels?: string[],
): SessionConfigSelectOption[] =>
  configurationChoices(option).filter(
    (choice) => !levels || levels.includes(choice.value),
  );

const argoOf = (
  choice?: SessionConfigSelectOption,
): ModelMetadata | undefined => choice?._meta?.argo;

// The effort levels the current model offers: none for a model without effort, every level when it names none.
export function configurationEffortChoices(
  model: SelectOption | undefined,
  option: SelectOption | undefined,
): SessionConfigSelectOption[] {
  const metadata = argoOf(currentConfigurationChoice(model)) ?? {};

  return metadata.supportsEffort === false
    ? []
    : offeredIn(option, metadata.supportedEffortLevels);
}

export interface EffortSelection {
  option: SelectOption | undefined;
  choices: SessionConfigSelectOption[];
  selected: SessionConfigSelectOption | undefined;
  fallback: boolean;
}

const selectOf = (
  options: SessionConfigOption[],
  category: StartingCategory,
): SelectOption | undefined =>
  options.find(
    (option): option is SelectOption =>
      option.type === 'select' && option.category === category,
  );

// The effort the model allows and the level it shows: effort always has one, the nearest offered level below the Agent's value, else the middle.
export function effortSelection(
  options: SessionConfigOption[],
): EffortSelection {
  const option = selectOf(options, 'thought_level');

  const choices = configurationEffortChoices(
    selectOf(options, 'model'),
    option,
  );

  return effortResult(option, choices);
}

function effortResult(
  option: SelectOption | undefined,
  choices: SessionConfigSelectOption[],
): EffortSelection {
  const current = currentConfigurationChoice(option, choices);

  return {
    option,
    choices,
    selected: current ?? fallbackEffort(option, choices),
    fallback: !current && choices.length > 0,
  };
}

function fallbackEffort(
  option: SelectOption | undefined,
  offered: SessionConfigSelectOption[],
): SessionConfigSelectOption | undefined {
  const all = configurationChoices(option);
  const rank = all.findIndex((choice) => choice.value === option?.currentValue);

  const below =
    rank < 0
      ? []
      : offered.filter(
          (choice) => all.findIndex((c) => c.value === choice.value) < rank,
        );

  return below.at(-1) ?? offered[Math.floor(offered.length / 2)];
}
