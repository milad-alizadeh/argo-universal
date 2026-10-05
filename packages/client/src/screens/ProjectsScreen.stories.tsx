import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { ProjectsScreenPreview } from '../../mocks/projects-screen-preview';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../mocks/session-list-mock';
import { fails, pending } from '../../mocks/trpc-mock-link';
import { ProjectsScreen } from './ProjectsScreen';

const meta = {
  component: ProjectsScreen,
  parameters: { trpc: sessionListMocks, previewPadding: false },
  render: () => (
    <ProjectsScreenPreview>
      <ProjectsScreen />
    </ProjectsScreenPreview>
  ),
} satisfies Meta<typeof ProjectsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};
export const Loading: Story = {
  parameters: { trpc: { 'session.list': pending() } },
};
export const Empty: Story = { parameters: { trpc: emptySessionListMocks } };
export const ErrorState: Story = {
  name: 'Error',
  parameters: { trpc: { 'session.list': fails('Server is down') } },
};
export const Reconnecting: Story = {
  parameters: { connection: 'reconnecting' },
};
export const Offline: Story = { parameters: { connection: 'offline' } };
