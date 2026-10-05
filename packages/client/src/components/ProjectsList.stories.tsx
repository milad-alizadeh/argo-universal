import { archivedSessions } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import {
  multipleProjects,
  projectsListProps,
} from '../../mocks/projects-list-mock';
import { ProjectsNewSessionPreview } from '../../mocks/projects-new-session-preview';
import { ProjectsPaginationPreview } from '../../mocks/projects-pagination-preview';
import { ProjectsList, type ProjectsListProps } from './ProjectsList';

const meta = {
  title: 'Sessions/ProjectsList',
  component: ProjectsList,
  args: {
    ...projectsListProps,
    onSelect: action('select Session'),
    onEndReached: action('load next page'),
    onNewSession: action('new Session in Project'),
    onProjectSettings: action('Project settings'),
  },
} satisfies Meta<typeof ProjectsList>;
export default meta;
type Story = StoryObj<typeof meta>;
function variations(
  values: { label: string; props: Partial<ProjectsListProps> }[],
): Story {
  return {
    render: (args) => (
      <Variations>
        {values.map(({ label, props }) => (
          <Variation key={label} label={label}>
            <View className="w-full wide:w-shell-list" style={{ height: 320 }}>
              <ProjectsList {...args} {...props} />
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
  render: (args) => <ProjectsPaginationPreview {...args} />,
};

export const OnNewSession: Story = {
  render: (args) => <ProjectsNewSessionPreview {...args} />,
};
export const OnProjectSettings: Story = variations([
  { label: 'Open Project settings', props: {} },
]);
