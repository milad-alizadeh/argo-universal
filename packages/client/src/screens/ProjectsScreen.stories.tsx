import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fails, pending } from '../../mocks/trpc-mock-link';
import { ProjectsScreen } from './ProjectsScreen';
import { projectsScreenMocks } from './ProjectsScreen.mocks';

const meta = {
  component: ProjectsScreen,
  parameters: { trpc: projectsScreenMocks },
} satisfies Meta<typeof ProjectsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const Loading: Story = {
  parameters: { trpc: { 'system.info': pending() } },
};

// Named so it does not shadow the global Error.
export const ErrorState: Story = {
  name: 'Error',
  parameters: { trpc: { 'system.info': fails('Server is down') } },
};
