import { archivedSessions } from '@repo/api/mocks';
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
function variations(
  values: { label: string; props: Partial<SessionsListProps> }[],
): Story {
  return {
    render: (args) => (
      <Variations>
        {values.map(({ label, props }) => (
          <Variation key={label} label={label}>
            <View className="w-full wide:w-shell-list" style={{ height: 320 }}>
              <SessionsList {...args} {...props} />
            </View>
          </Variation>
        ))}
      </Variations>
    ),
  };
}
export const Projects: Story = variations([
  { label: 'One Project', props: {} },
  { label: 'Multiple Projects', props: { projects: multipleProjects } },
  { label: 'No Projects', props: { projects: [] } },
]);
export const Query: Story = variations([
  { label: 'No matching Sessions', props: { query: 'xyz', sessions: [] } },
]);
export const Archived: Story = variations([
  {
    label: 'Archived Sessions',
    props: { archived: true, sessions: archivedSessions.sessions },
  },
  { label: 'No archived Sessions', props: { archived: true, sessions: [] } },
]);
export const OnEndReached: Story = {
  render: (args) => <SessionsPaginationPreview {...args} />,
};

export const OnNewSession: Story = {
  render: (args) => <SessionsNewSessionPreview {...args} />,
};
