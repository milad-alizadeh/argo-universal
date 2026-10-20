import type { Subagent } from '@repo/contracts';
import type { FeedProps } from '#features/feed';

// One Subagent's own Feed, opened from the Subagents list. It is read-only: no Composer and no Stop.
export interface SubagentFeedProps {
  subagent: Subagent;
  // The child Session's rows, through `toSubagentFeedView`.
  feed: FeedProps;
  // Back to the Subagents list, in the Inspector and in the Sheet.
  onBack: () => void;
  // Fixes the meta line's clock, for stories and tests.
  now?: number;
}
