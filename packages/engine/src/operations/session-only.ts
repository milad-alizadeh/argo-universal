import type { ScreenSight } from '../screen-sight';
import type { CallerImplementations, NewSessionId } from './implementations';
import type { SessionCaller } from './session-tokens';
import { withoutConnection } from './without-connection';

type SessionOnly = Pick<
  CallerImplementations<[NewSessionId]>,
  'session.queue' | 'voice.start' | 'app.screenshot'
>;

/*
 * What a Session caller runs differently from the person: it has no App Connection, so the Operations that need one
 * are refused, and a capture it asks for is the Agent's, so the Feed's Notice says so.
 */
export const sessionOnly = (
  screenSight: ScreenSight,
  { sessionId }: SessionCaller,
): SessionOnly => ({
  ...withoutConnection,
  'app.screenshot': () => screenSight.capture({ kind: 'agent', sessionId }),
});
