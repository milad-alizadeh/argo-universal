import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../mocks/session-list-mock';
import { pending } from '../../mocks/trpc-mock-link';
import { SessionsScreen } from './SessionsScreen';

const meta = {
  component: SessionsScreen,
  parameters: { trpc: sessionListMocks },
} satisfies Meta<typeof SessionsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithSessions: Story = {};
export const WithoutSessions: Story = {
  parameters: { trpc: emptySessionListMocks },
};
export const Loading: Story = {
  parameters: { trpc: { ...sessionListMocks, 'session.list': pending() } },
};
