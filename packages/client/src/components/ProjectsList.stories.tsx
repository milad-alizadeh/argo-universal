import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { action } from 'storybook/actions';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import {
  multipleProjects,
  projectsListProps,
} from '../../mocks/projects-list-mock';
import { ProjectsList, type ProjectsListProps } from './ProjectsList';

const meta = {
  title: 'Sessions/ProjectsList',
  component: ProjectsList,
  args: {
    ...projectsListProps,
    onSelect: action('select Session'),
    onEndReached: action('load next page'),
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
            <View style={{ height: 320 }}>
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
export const Agents: Story = variations([
  { label: 'Agent logos', props: {} },
  { label: 'No registered Agents', props: { agents: [] } },
]);
export const Sessions: Story = variations([
  { label: 'Populated', props: {} },
  { label: 'Empty', props: { sessions: [] } },
]);
export const Query: Story = variations([
  { label: 'No search', props: {} },
  { label: 'No matching Sessions', props: { query: 'xyz', sessions: [] } },
]);
export const Archived: Story = variations([
  { label: 'Active', props: {} },
  { label: 'No archived Sessions', props: { archived: true, sessions: [] } },
]);
export const SelectedSessionId: Story = variations([
  { label: 'No selection', props: {} },
  {
    label: 'Selected Session',
    props: { selectedSessionId: projectsListProps.sessions[0]?.sessionId },
  },
]);
export const OnSelect: Story = variations([
  { label: 'Select a Session', props: {} },
]);
export const OnEndReached: Story = variations([
  { label: 'Scroll to request the next page', props: {} },
]);
