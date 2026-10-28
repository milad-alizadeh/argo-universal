import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { recordedAcpContent } from '../../../../lib/product/acp-feed-content.mocks';
import {
  type MockAgent,
  recordedImageUrl,
} from '../../../../lib/product/feed-message.mocks';
import { toFeedView } from '../../view/to-feed-view';
import type { Feed, FeedProps } from '../feed/feed';

type FeedStory = StoryObj<typeof Feed>;

export type FeedPlayContext = Parameters<NonNullable<FeedStory['play']>>[0];

// The FeedContent stories' args: an empty Feed each story fills.
export const feedContentArgs = {
  items: [],
  liveHeader: null,
  loadingOlder: false,
  onStartReached: (): void => {},
  imageUrl: recordedImageUrl,
} satisfies FeedProps;

// An Agent's recorded supported content, checked at one viewport width.
export function supportedContent(
  viewportWidth: number,
  agent: MockAgent,
  check: (context: FeedPlayContext) => Promise<void>,
): FeedStory {
  const { rows, snapshot } = recordedAcpContent(agent);

  return {
    args: { items: toFeedView(rows, snapshot).items },
    play: async (context) => {
      await settleLayout(viewportWidth);
      await check(context);
    },
  };
}
