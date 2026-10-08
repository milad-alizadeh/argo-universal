import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
export const models: ModelInfo[] = [
  {
    value: 'default',
    displayName: 'Default (recommended)',
    description: 'Opus 5.5 · Best for everyday, complex tasks',
    resolvedModel: 'claude-opus-5-5',
    supportsEffort: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'max'],
    supportsAutoMode: true,
  },
  { value: 'haiku', displayName: 'Haiku', description: 'Fastest' },
];
export function requireModel(index: number): ModelInfo {
  const model = models[index];
  if (!model) throw new Error('Missing model fixture');
  return model;
}
