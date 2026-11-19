import { appOnlyRefusal } from './app-only';
import type { CallerImplementations, NewSessionId } from './implementations';

type ConnectionOperations = Pick<
  CallerImplementations<[NewSessionId]>,
  'session.queue' | 'voice.start'
>;

// A Session caller has no App Connection, so the Operations that need one are refused rather than run without it.
export const withoutConnection: ConnectionOperations = {
  'session.queue': () => Promise.reject(appOnlyRefusal('session.queue')),
  'voice.start': () => Promise.reject(appOnlyRefusal('voice.start')),
};
