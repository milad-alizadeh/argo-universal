import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import {
  multipleProjects,
  sessionsListProps,
  largeSessions,
} from '../../../../mocks/sessions-list-mock';
import { SessionsList, type SessionsListProps } from './sessions-list';

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
  render: (args): React.JSX.Element => (
    <View className="flex-1 w-full wide:w-shell-list" style={{ minHeight: 0 }}>
      <SessionsList {...args} />
    </View>
  ),
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
  render: (args): React.JSX.Element => (
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
  args: { sessions: largeSessions.slice(0, 20), isFetchingNextPage: true },
};

export const NewSession: Story = {
  name: 'New Session',
  parameters: { screenPreview: true },
  args: { sessions: largeSessions.slice(0, 12) },
};
