import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { compactionStates, noticeStates } from '../../mocks/feed-paper';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { FeedCompaction } from './feed-advisory';
import { FeedNotice } from './feed-notice';

const [compaction] = compactionStates;
if (!compaction) throw new Error('Advisory gallery needs a Compaction');
const meta = {
  title: 'Feed/Advisories',
  component: FeedCompaction,
  args: { row: compaction },
} satisfies Meta<typeof FeedCompaction>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Advisories: Story = {
  render: () => (
    <Variations>
      {noticeStates.map((row) => (
        <Variation key={row.severity} label={row.severity}>
          <FeedNotice row={row} />
        </Variation>
      ))}
      {compactionStates.map((row) => (
        <Variation key={row.status} label={row.status}>
          <FeedCompaction row={row} />
        </Variation>
      ))}
    </Variations>
  ),
};
