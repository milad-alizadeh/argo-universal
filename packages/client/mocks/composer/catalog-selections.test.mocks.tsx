import type { AgentInfo, SessionConfigSelectOption } from '@repo/contracts';
export interface CatalogSelection {
  choices: SessionConfigSelectOption[];
  current: string;
}
export function selection(
  agent: AgentInfo,
  category: string,
): CatalogSelection {
  const option = agent.configOptions.find(
    (entry) => entry.category === category && entry.type === 'select',
  );
  if (option?.type !== 'select')
    throw new Error(
      `Recorded catalog needs ${category} options for ${agent.label}.`,
    );
  return {
    choices: option.options.flatMap((entry) =>
      'groupId' in entry ? entry.options : [entry],
    ),
    current: option.currentValue,
  };
}
export function currentEffortModel(
  agent: AgentInfo,
  models: CatalogSelection,
): void {
  const model = models.choices.find((entry) => entry.value === models.current);
  if (!supportsEffort(model))
    throw new Error(
      `Recorded catalog needs a current model with effort for ${agent.label}.`,
    );
}
function supportsEffort(model: SessionConfigSelectOption | undefined): boolean {
  if (!model) return false;
  return hasEffortMetadata(model);
}
export function effortChoice(
  agent: AgentInfo,
  effort: CatalogSelection,
  value: string,
): SessionConfigSelectOption {
  const choice = effort.choices.find((entry) => entry.value === value);
  if (!choice)
    throw new Error(
      `Recorded catalog needs ${value === effort.current ? 'a current model with effort' : 'a high effort'} for ${agent.label}.`,
    );
  return choice;
}
export function highEffortModel(
  agent: AgentInfo,
  models: CatalogSelection,
): SessionConfigSelectOption {
  const model = models.choices.find(supportsHighEffort);
  if (!model)
    throw new Error(
      `Recorded catalog needs a model with high effort for ${agent.label}.`,
    );
  return model;
}
function supportsHighEffort(model: SessionConfigSelectOption): boolean {
  return Boolean(effortLevels(model)?.includes('high'));
}
function effortLevels(model: SessionConfigSelectOption): string[] | undefined {
  return model._meta?.argo?.supportedEffortLevels;
}
export function modeChoice(
  agent: AgentInfo,
  modes: CatalogSelection,
  tone: string,
): SessionConfigSelectOption {
  const mode = modes.choices.find((entry) => modeTone(entry) === tone);
  if (!mode)
    throw new Error(
      `Recorded catalog needs Plan and dangerous modes for ${agent.label}.`,
    );
  return mode;
}
function modeTone(model: SessionConfigSelectOption): string | undefined {
  return model._meta?.argo?.tone;
}
export function highEffortLabels(
  model: SessionConfigSelectOption,
  effort: CatalogSelection,
): string[] {
  const supported = effortLevels(model);
  return effort.choices
    .filter((entry) => !supported || supported.includes(entry.value))
    .map((entry) => entry.name);
}

function hasEffortMetadata(model: SessionConfigSelectOption): boolean {
  return Boolean(model._meta?.argo?.supportsEffort);
}
