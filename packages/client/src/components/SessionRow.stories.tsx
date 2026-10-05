import { agentsList, sessionRows } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import { sessionRowMocks } from '../../mocks/session-row-mock';
import { SessionRow } from './SessionRow';

const meta = {
  title: 'Sessions/SessionRow',
  component: SessionRow,
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
      {Object.entries(sessionRows).map(([name, session]) => (
        <Variation key={name} label={name}>
          <SessionRow {...args} session={session} />
        </Variation>
      ))}
      <Variation label="Plan and running Subagents">
        <SessionRow {...args} session={sessionRowMocks.planAndSubagents} />
      </Variation>
      <Variation label="Completed Plan and finished Subagents">
        <SessionRow {...args} session={sessionRowMocks.finishedSubagents} />
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

export const OnSelect: Story = {
  args: { selected: true },
};
