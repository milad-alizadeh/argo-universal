import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { compactionStates, noticeStates } from '../../../mocks/feed-paper';
import { Variation, Variations } from '../../../storybook/variations';
import { FeedNotice } from './feed-notice';

const [notice] = noticeStates;
if (!notice) throw new Error('Notice gallery needs a Notice');
const meta = {
  title: 'Feed/Notices',
  component: FeedNotice,
  args: { row: notice },
} satisfies Meta<typeof FeedNotice>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Notices: Story = {
  render: () => (
    <Variations>
      {noticeStates.map((row) => (
        <Variation key={row.severity} label={row.severity}>
          <FeedNotice row={row} />
        </Variation>
      ))}
      {compactionStates.map((row) => (
        <Variation key={row.status} label={`Compaction ${row.status}`}>
          <FeedNotice row={row} />
        </Variation>
      ))}
    </Variations>
  ),
};
