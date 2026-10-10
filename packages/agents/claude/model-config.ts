import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import type {
  SessionConfigOption,
  SessionConfigSelectOption,
} from '@repo/contracts';
import { DEFAULT_VALUE } from './config-values';
export const findModel = (
  models: ModelInfo[],
  value: unknown,
): ModelInfo | undefined =>
  models.find((model): boolean => model.value === value);
function modelName(model: ModelInfo): string {
  if (model.value !== DEFAULT_VALUE) return model.displayName;
  if (model.description.includes(' · ')) return describedModelName(model);
  return resolvedModelName(model);
}
function describedModelName(model: ModelInfo): string {
  return model.description.split(' · ')[0]?.trim() || model.displayName;
}
function resolvedModelName(model: ModelInfo): string {
  const resolved = model.resolvedModel?.match(
    /claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?/,
  );
  if (resolved) return resolvedName(resolved);
  return recommendedName(model.displayName);
}
function resolvedName(resolved: RegExpMatchArray): string {
  const family = resolved[1] ?? '';
  const name = `${family.charAt(0).toUpperCase()}${family.slice(1)}`;
  const minor = resolved[3] ? `.${resolved[3]}` : '';
  return `${name} ${resolved[2]}${minor}`;
}
function description(
  model: ModelInfo,
): Pick<SessionConfigSelectOption, 'description'> {
  if (!model.description) return {};
  return {
    description:
      model.value === DEFAULT_VALUE
        ? withoutModelPrefix(model, model.description)
        : model.description,
  };
}
function withoutModelPrefix(model: ModelInfo, description: string): string {
  const prefix = `${modelName(model)} · `;
  return description.startsWith(prefix)
    ? description.slice(prefix.length)
    : description;
}
export function modelConfigOption(
  models: ModelInfo[],
  model: string,
): SessionConfigOption {
  return {
    type: 'select',
    configId: 'model',
    name: 'Model',
    category: 'model',
    currentValue: model,
    options: modelChoices(models),
  };
}
function modelChoices(models: ModelInfo[]): SessionConfigSelectOption[] {
  const choices = models.map(modelOption);
  if (findModel(models, DEFAULT_VALUE)) return choices;
  return [{ value: DEFAULT_VALUE, name: 'Provider default' }, ...choices];
}
function modelOption(model: ModelInfo): SessionConfigSelectOption {
  const shortName = modelName(model);
  return {
    value: model.value,
    name:
      model.value === DEFAULT_VALUE ? `${shortName} (recommended)` : shortName,
    _meta: { argo: { shortName, ...modelCapabilities(model) } },
    ...description(model),
  };
}
function modelCapabilities(
  model: ModelInfo,
): NonNullable<SessionConfigSelectOption['_meta']>['argo'] {
  return {
    supportsEffort: model.supportsEffort ?? false,
    ...supportedLevels(model),
    supportsAdaptiveThinking: model.supportsAdaptiveThinking ?? false,
    ...quickCapabilities(model),
  };
}
function quickCapabilities(
  model: ModelInfo,
): NonNullable<SessionConfigSelectOption['_meta']>['argo'] {
  return {
    supportsFastMode: model.supportsFastMode ?? false,
    supportsAutoMode: model.supportsAutoMode ?? false,
  };
}

function supportedLevels(
  model: ModelInfo,
): NonNullable<SessionConfigSelectOption['_meta']>['argo'] {
  return { supportedEffortLevels: model.supportedEffortLevels ?? [] };
}

function recommendedName(displayName: string): string {
  const trimmed = displayName.trimEnd();
  const suffix = '(recommended)';
  return trimmed.toLowerCase().endsWith(suffix)
    ? trimmed.slice(0, -suffix.length).trimEnd()
    : displayName;
}
