import { newSessionProjects, serverInfo } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { StartSessionIn } from './start-session-in';

const meta = {
  title: 'Composer/StartSessionIn',
  component: StartSessionIn,
  args: {
    serverName: serverInfo.name,
    serverConnected: true,
    projects: newSessionProjects,
    projectId: newSessionProjects[0]?.id ?? '',
    onProjectChange: fn(),
    checkout: { branch: 'main', newWorktree: false },
  },
} satisfies Meta<typeof StartSessionIn>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Context: Story = {};
