import type {
  AgentLoginTerminalFrame,
  AgentLoginTerminalInput,
} from '@repo/contracts';
import type { TerminalAppearance } from './terminal-appearance';

export type LoginTerminalProps = {
  appearance?: TerminalAppearance;
  enabled: boolean;
  onRead: (cursor: number) => Promise<AgentLoginTerminalFrame>;
  onInput: (input: AgentLoginTerminalInput) => Promise<void>;
  onFailure: (message: string) => Promise<void>;
};
