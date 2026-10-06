import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  emptySessionMocks,
  idleSessionMocks,
  loadingOlderSessionMocks,
  longSessionMocks,
  runningSessionMocks,
  sessionNow,
} from '../../mocks/session-screen-mock';
import { SessionScreenPreview } from '../../mocks/session-screen-preview';
import { SessionScreen } from './SessionScreen';

const meta = {
  title: 'Screens/SessionScreen',
  component: SessionScreen,
  parameters: { trpc: runningSessionMocks, screenPreview: true },
  args: { id: 'session-1', now: sessionNow },
  render: (args) => <SessionScreenPreview {...args} />,
} satisfies Meta<typeof SessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'SessionScreen' };

export const Idle: Story = { parameters: { trpc: idleSessionMocks } };

export const LoadingEarlier: Story = {
  parameters: { trpc: loadingOlderSessionMocks },
};

export const LongFeed: Story = { parameters: { trpc: longSessionMocks } };

export const Empty: Story = { parameters: { trpc: emptySessionMocks } };
