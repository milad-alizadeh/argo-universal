import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { newSessionMocks } from '../../mocks/new-session-mock';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../mocks/session-list-mock';
import { pending } from '../../mocks/trpc-mock-link';
import { FirstSessionScreen } from './first-session-screen';

const meta = {
  component: FirstSessionScreen,
  parameters: { trpc: sessionListMocks },
} satisfies Meta<typeof FirstSessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithSessions: Story = {};
export const WithoutSessions: Story = {
  parameters: { trpc: { ...emptySessionListMocks, ...newSessionMocks } },
};
export const Loading: Story = {
  parameters: { trpc: { ...sessionListMocks, 'session.list': pending() } },
};
