import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { ProjectListView } from './project-list-view';
import { serverCaption, settingsProjects } from './settings-pages.mocks';

const meta = {
  title: 'Screens/Settings/Projects',
  component: ProjectListView,
  parameters: { screenPreview: true },
  args: {
    caption: serverCaption,
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
