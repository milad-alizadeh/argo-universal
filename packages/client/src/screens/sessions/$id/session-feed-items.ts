import { type FeedProps, withPartialTranscripts } from '#features/feed';
import type { OpenSession } from './session-composer-props';
import type { StoppedTurn } from './stopped-turn';

// The Feed's items, with what is being said on a Conversation drawn last.
export const feedItems = (
  open: OpenSession,
  stoppedEnding: StoppedTurn['ending'] | undefined,
): FeedProps['items'] =>
  withPartialTranscripts(
    open.view.items.filter((item) => item !== stoppedEnding),
    open.partials ?? [],
    open.sessionId,
  );
