import { recordedFeedMock } from '../../../../lib/product/feed-message.mocks';
import type { FeedViewItem } from '../../view/feed-view';
import { toFeedView } from '../../view/to-feed-view';

function items(recording: string): FeedViewItem[] {
  const mock = recordedFeedMock('agent-1', recording);

  return toFeedView(mock.rows, mock.snapshot).items;
}

// Recorded Turns whose widest content (a diff, code, a table, an image) must fit a phone's column.
export const rhythmAudits = {
  transitions: items('edit-and-command'),
  markdown: items('markdown-answer'),
  attachments: items('image-prompt'),
} satisfies Record<string, FeedViewItem[]>;
