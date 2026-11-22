import type { AgentSuggestionModel } from '@repo/contracts';

export const suggestionModels: AgentSuggestionModel[] = [
  {
    id: 'first-agent',
    name: 'Claude Agent',
    choice: { type: 'model', value: 'haiku' },
    models: [
      { value: 'default', name: 'Default' },
      { value: 'opus', name: 'Opus' },
      { value: 'sonnet', name: 'Sonnet' },
      { value: 'haiku', name: 'Haiku' },
    ],
  },
  {
    id: 'second-agent',
    name: 'Codex',
    choice: { type: 'session' },
    models: [
      { value: 'gpt-6.1-sol', name: 'GPT-6.1 Sol' },
      { value: 'gpt-6-luna', name: 'GPT-6 Luna' },
    ],
  },
];
