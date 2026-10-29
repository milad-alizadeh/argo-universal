import { isModelOption, type SessionConfigOption } from '@repo/contracts';
import type { AgentConfigValue } from './values';

// The value each option runs with now, as the Session stores its durable choices.
export const toConfigValues = (
  options: SessionConfigOption[],
): AgentConfigValue[] =>
  options.map((option) => ({
    configId: option.configId,
    value: option.currentValue,
  }));

export const currentModel = (options: SessionConfigOption[]): string | null => {
  const model = options.find(isModelOption);

  return model?.type === 'select' ? model.currentValue : null;
};
