import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import {
  multipleProjects,
  sessionsListProps,
} from '../../mocks/sessions-list-mock';
import { SessionsNewSessionPreview } from '../../mocks/sessions-new-session-preview';
import { SessionsPaginationPreview } from '../../mocks/sessions-pagination-preview';
import { SessionsList, type SessionsListProps } from './SessionsList';

const meta = {
  title: 'Sessions/SessionsList',
  component: SessionsList,
  args: {
    ...sessionsListProps,
    onSelect: action('select Session'),
    onEndReached: action('load next page'),
    onNewSession: action('new Session in Project'),
    onProjectSettings: action('Project settings'),
  },
} satisfies Meta<typeof SessionsList>;
export default meta;
type Story = StoryObj<typeof meta>;

const states: { label: string; props: Partial<SessionsListProps> }[] = [
  {
    label: 'Multiple Projects, one without Sessions',
    props: {
      projects: multipleProjects,
      sessions: sessionsListProps.sessions.slice(0, 2),
    },
  },
  { label: 'No Projects', props: { projects: [] } },
  { label: 'No matching Sessions', props: { query: 'xyz', sessions: [] } },
  { label: 'No archived Sessions', props: { archived: true, sessions: [] } },
];

// Each frame bounds the virtualized list the way the Sessions screen does.
export const States: Story = {
  render: (args) => (
    <Variations>
      {states.map(({ label, props }) => (
        <Variation key={label} label={label}>
          <View className="w-full wide:w-shell-list" style={{ height: 320 }}>
            <SessionsList {...args} {...props} />
          </View>
        </Variation>
      ))}
    </Variations>
  ),
};

export const Pagination: Story = {
  parameters: { screenPreview: true },
  render: (args) => <SessionsPaginationPreview {...args} />,
};

export const NewSession: Story = {
  name: 'New Session',
  parameters: { screenPreview: true },
  render: (args) => <SessionsNewSessionPreview {...args} />,
};
