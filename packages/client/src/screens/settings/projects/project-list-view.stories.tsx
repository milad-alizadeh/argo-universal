import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { mockHeader } from '../../../../mocks/screen-header-mock';
import { settingsProjects } from '../../../features/settings/components/settings-pages.mocks';
import { projectsHeader } from './project-list-phone-header';
import { ProjectListView } from './project-list-view';

const meta = {
  title: 'Screens/Settings/Projects',
  component: ProjectListView,
  parameters: { screenPreview: true },
  args: {
    projects: { status: 'loaded', projects: settingsProjects },
    onOpenProject: action('open Project'),
    renderHeader: mockHeader(projectsHeader),
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
