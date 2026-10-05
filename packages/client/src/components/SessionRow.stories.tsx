import { agentsList, sessionRows } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { SessionRowListMock } from '../../mocks/session-row-list-mock';
import {
  paperSessionMetadata,
  paperSessionRows,
} from '../../mocks/session-row-mock';
import { SessionRow } from './SessionRow';

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

export const Session: Story = {
  render: (args) => (
    <Variations>
      <Variation label="Paper · Session list">
        <SessionRowListMock
          sessions={paperSessionRows}
          metadata={paperSessionMetadata}
          selectedSessionId={paperSessionRows[0]?.sessionId}
          onSelect={args.onSelect}
        />
      </Variation>
      <Variation label="Other Session states">
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

export const Logo: Story = {
  render: (args) => (
    <Variations>
      {agentsList.map((agent) => (
        <Variation key={agent.agent} label={agent.label}>
          <SessionRow
            {...args}
            logo={agent.logo}
            session={{ ...args.session, agent: agent.agent }}
          />
        </Variation>
      ))}
    </Variations>
  ),
};

export const Selected: Story = {
  render: (args) => (
    <Variations>
      {[false, true].map((selected) => (
        <Variation
          key={String(selected)}
          label={selected ? 'Selected' : 'Unselected'}
        >
          <SessionRow {...args} selected={selected} />
        </Variation>
      ))}
    </Variations>
  ),
};

export const Issue: Story = {
  render: (args) => (
    <Variations>
      {[undefined, { number: 128 }].map((issue) => (
        <Variation
          key={issue?.number ?? 'none'}
          label={issue ? 'Issue' : 'No Issue'}
        >
          <SessionRow {...args} issue={issue} />
        </Variation>
      ))}
    </Variations>
  ),
};

export const PullRequest: Story = {
  render: (args) => (
    <Variations>
      {(['open', 'draft', 'merged', 'conflict', 'closed'] as const).map(
        (status) => (
          <Variation key={status} label={status}>
            <SessionRow {...args} pullRequest={{ number: 45, status }} />
          </Variation>
        ),
      )}
    </Variations>
  ),
};

export const SubagentsFailed: Story = {
  args: { session: paperSessionRows[2] },
  render: (args) => (
    <Variations>
      {[false, true].map((subagentsFailed) => (
        <Variation
          key={String(subagentsFailed)}
          label={subagentsFailed ? 'Failed Subagent' : 'Finished Subagents'}
        >
          <SessionRow {...args} subagentsFailed={subagentsFailed} />
        </Variation>
      ))}
    </Variations>
  ),
};
