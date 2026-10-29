import type { SessionSetConfigOptionInput } from '@repo/contracts';
import type {
  SessionCommand,
  SessionContext,
  SessionWrite,
  setConfigEvent,
} from '../session-context';

// One choice of value for one of the Agent's options.
export type AgentConfigValue = Pick<
  SessionSetConfigOptionInput,
  'configId' | 'value'
>;

// A choice sent to the Session, with the caller waiting for its outcome.
export type ConfigChoice = Extract<
  SessionCommand,
  { type: typeof setConfigEvent }
>;

// What one configuration step changes in the Session, and what it asks the writer to store.
export type ConfigurationStep = {
  change: Partial<SessionContext>;
  writes: SessionWrite[];
};
