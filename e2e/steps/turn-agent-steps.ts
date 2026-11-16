import { agentStep } from './agent-steps';

export const turnAgentSteps = [
  [
    agentStep('asks permission before its command details arrive'),
    'permission-command-late',
  ],
  [agentStep('holds its first Turn until released'), 'held-until-released'],
  [agentStep('fails its second queued Turn'), 'queued-turn-fails'],
  [agentStep('refuses queued images'), 'queued-image-refused'],
  [agentStep('accepts steering into its held Turn'), 'queued-steering'],
  [agentStep('predicts the next Prompt'), 'follow-up-suggestion'],
] as const;
