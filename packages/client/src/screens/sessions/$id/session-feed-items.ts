import { type FeedProps } from '#features/feed';
import type { OpenSession } from './session-composer-props';
import type { StoppedTurn } from './stopped-turn';

// Leave out the ending drawn above the Composer.
export const feedItems = (
  open: OpenSession,
  stoppedEnding: StoppedTurn['ending'] | undefined,
): FeedProps['items'] =>
  stoppedEnding
    ? open.view.items.filter((item) => item !== stoppedEnding)
    : open.view.items;
