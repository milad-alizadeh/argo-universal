import type { EffortLevel } from '@anthropic-ai/claude-agent-sdk';
import type { Mode } from './config-modes';
export const DEFAULT_VALUE = 'default';
export interface ConfigValues {
  mode: Mode;
  model: string;
  effort: EffortLevel | typeof DEFAULT_VALUE;
}
