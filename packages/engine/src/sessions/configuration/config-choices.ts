import type { SessionSetConfigOptionInput } from '@repo/contracts';
type AgentConfigValue = Pick<SessionSetConfigOptionInput, 'configId' | 'value'>;
import type { SessionConfigOption } from '@repo/contracts';

export const toConfigValues = (
  configOptions: SessionConfigOption[],
): AgentConfigValue[] =>
  configOptions.map((option): AgentConfigValue => ({
    configId: option.configId,
    value: option.currentValue,
  }));

export const currentModel = (
  configOptions: SessionConfigOption[],
): string | null => {
  const model = configOptions.find(
    (option): boolean => option.category === 'model',
  );
  return model?.type === 'select' ? model.currentValue : null;
};
