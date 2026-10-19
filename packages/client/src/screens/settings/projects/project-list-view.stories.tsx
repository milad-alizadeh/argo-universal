import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { ListDetail } from '#primitives/scaffolds/list-detail';
import {
  settingsProjects,
  worktreeProject,
} from '../../../features/settings/components/settings-pages.mocks';
import { ProjectDetailView } from './$name/project-detail-view';
import { ProjectListView } from './project-list-view';

const meta = {
  title: 'Screens/Settings/Projects',
  component: ProjectListView,
  parameters: { screenPreview: true },
  args: {
    projects: { status: 'loaded', projects: settingsProjects },
    onOpenProject: action('open Project'),
  },
} satisfies Meta<typeof ProjectListView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = { args: { projects: { status: 'loading' } } };

export const LoadError: Story = { args: { projects: { status: 'error' } } };

export const NoProjects: Story = {
  args: { projects: { status: 'loaded', projects: [] } },
};

export const NoMatches: Story = { args: { initialSearch: 'nothing-here' } };

// On a wide window the open Project sits beside the list, its row marked.
export const BesideAProject: Story = {
  args: { selected: worktreeProject.name },
  render: (args) => (
    <ListDetail
      list={<ProjectListView {...args} />}
      detail={
        <ProjectDetailView
          name={worktreeProject.name}
          project={{ status: 'loaded', project: worktreeProject }}
          onBack={action('back')}
        />
      }
    />
  ),
};
