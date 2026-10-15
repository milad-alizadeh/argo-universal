import { agentsList, sessionRows } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../../../lib/generic/variations';
import type { SessionsLayout } from '../../state/sessions-layout';
import { SessionRow } from './session-row';
import {
  SessionRowListMock,
  type SessionRowListMockProps,
} from './session-row-list.mocks';
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

const unreadLongTitleArchived = [
  sessionRows.unread,
  sessionRows.longTitle,
  sessionRows.archived,
];

const paperList = {
  sessions: paperSessionRows,
  metadata: paperSessionMetadata,
  selectedSessionId: paperSessionRows[0]?.sessionId,
};

function PaperSessionList(
  props: Pick<SessionRowListMockProps, 'layout' | 'onSelect'>,
): React.JSX.Element {
  return <SessionRowListMock {...paperList} {...props} />;
}

/*
 * Paper's list: every status, both Agents, Issue and pull request metadata, a failed Subagent,
 * a finished Plan with no bar, and the first row selected on wide layouts.
 */
export const Overview: Story = {
  name: 'SessionRow',
  render: (args) => (
    <Variations>
      <Variation label="Regular, every status">
        <PaperSessionList layout="regular" onSelect={args.onSelect} />
      </Variation>
      <Variation label="Unread, long title and archived">
        <SessionRowListMock
          sessions={unreadLongTitleArchived}
          onSelect={args.onSelect}
        />
      </Variation>
    </Variations>
  ),
};

// One line per Session: its PR's glyph in the PR's state colour, or with no PR how long ago it was active.
export const Compact: Story = {
  name: 'Compact',
  render: (args) => (
    <PaperSessionList layout="compact" onSelect={args.onSelect} />
  ),
};

// The pointer over a row tints it; Regular keeps its hairline. Wide layouts only.
function hovered(layout: SessionsLayout): Story {
  return {
    args: {
      ...paperSessionMetadata['session-plan'],
      layout,
      session: paperSessionRows[0] ?? sessionRows.running,
    },
    play: async ({ canvas, userEvent }) => {
      await userEvent.hover(canvas.getByRole('button'));
    },
  };
}

export const Hovered: Story = { name: 'Hovered', ...hovered('regular') };

export const CompactHovered: Story = {
  name: 'Compact hovered',
  ...hovered('compact'),
};
