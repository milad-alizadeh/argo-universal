import { agentsList, sessionRows } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../../storybook/variations';
import { SessionRow } from './session-row';
import { SessionRowListMock } from './session-row-list.mocks';
import { paperSessionMetadata, paperSessionRows } from './session-row.mocks';

const meta = {
  title: 'Sessions/SessionRow',
  component: SessionRow,
  parameters: { previewPadding: false },
  args: {
    session: sessionRows.running,
    logo: agentsList[0]?.logo ?? '',
    onSelect: action('select Session'),
  },
} satisfies Meta<typeof SessionRow>;
export default meta;
type Story = StoryObj<typeof meta>;

// The Paper list covers both Agents, Issue and pull request metadata, a failed Subagent, and selection on wide layouts.
export const Overview: Story = {
  name: 'SessionRow',
  render: (args) => (
    <Variations>
      <Variation label="Paper Session list">
        <SessionRowListMock
          sessions={paperSessionRows}
          metadata={paperSessionMetadata}
          selectedSessionId={paperSessionRows[0]?.sessionId}
          onSelect={args.onSelect}
        />
      </Variation>
      <Variation label="Unread, long title and archived">
        <SessionRowListMock
          sessions={[
            sessionRows.unread,
            sessionRows.longTitle,
            sessionRows.archived,
          ]}
          onSelect={args.onSelect}
        />
      </Variation>
    </Variations>
  ),
};
