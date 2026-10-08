import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
export const models: ModelInfo[] = [
  {
    value: 'default',
    displayName: 'Default (recommended)',
    description: 'Example model · Best for everyday, complex tasks',
    resolvedModel: 'example-model',
    supportsEffort: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'max'],
    supportsAutoMode: true,
  },
  {
    value: 'compact',
    displayName: 'Compact model',
    description: 'Fastest',
  },
];
export function requireModel(index: number): ModelInfo {
  const model = models[index];
  if (!model) throw new Error('Missing model fixture');
  return model;
}
