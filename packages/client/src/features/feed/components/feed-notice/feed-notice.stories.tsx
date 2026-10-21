import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { FeedNotice } from './feed-notice';
import {
  compactedNotice,
  compactingNotice,
  compactionFailedNotice,
  compactionStoppedNotice,
  errorNotice,
  infoNotice,
  unrecognisedNotice,
  warningNotice,
} from './feed-notice-fixtures';

const meta = {
  title: 'Feed/FeedNotice',
  component: FeedNotice,
  // A Notice or a Compaction row; the component reads its severity or its status.
  argTypes: { row: { control: false } },
  args: infoNotice,
} satisfies Meta<typeof FeedNotice>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * One story per severity and per Compaction status. No story for a Compaction status Argo
 * does not know: the recordings hold none, and the row then reads like Unrecognised.
 */

export const Info: Story = { args: infoNotice };

export const Warning: Story = { args: warningNotice };

// `Error` is a global, so the story is named for what it draws.
export const ErrorNotice: Story = { args: errorNotice };

// A severity Argo does not know yet: the row keeps the words and says so.
export const Unrecognised: Story = { args: unrecognisedNotice };

// Compaction runs, so its title shimmers.
export const Compacting: Story = { args: compactingNotice };

export const Compacted: Story = { args: compactedNotice };

// A failed Compaction reads red, with the Agent's reason under it.
export const CompactionFailed: Story = { args: compactionFailedNotice };

export const CompactionStopped: Story = { args: compactionStoppedNotice };
