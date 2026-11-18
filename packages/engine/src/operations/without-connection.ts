import type {
  CallerImplementations,
  NewSessionId,
  PlainImplementations,
} from './implementations';

type Connectionless = Pick<
  CallerImplementations<[NewSessionId]>,
  'session.queue' | 'voice.start'
>;

// A Session caller has no App Connection to watch, so the Operations that take one run without it.
export const withoutConnection = (
  plain: PlainImplementations,
): Connectionless => ({
  'session.queue': (params) => plain['session.queue'](params),
  'voice.start': (params) => plain['voice.start'](params),
});
