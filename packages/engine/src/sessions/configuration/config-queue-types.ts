import {
  setConfigEvent,
  type SessionCommand,
  type SessionContext,
  type SessionWrite,
} from '../session-context';

export type ConfigChoice = Extract<
  SessionCommand,
  { type: typeof setConfigEvent }
>;

export type ConfigChange<Keys extends keyof SessionContext> = {
  change: Pick<SessionContext, Keys>;
  writes: SessionWrite[];
};
