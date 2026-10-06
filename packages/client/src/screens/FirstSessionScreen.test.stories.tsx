import { activeSessions } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { newSessionMocks } from '../../mocks/new-session-mock';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../mocks/session-list-mock';
import { FirstSessionScreen } from './FirstSessionScreen';

const firstSessionId = activeSessions.sessions[0]?.sessionId ?? '';

const meta = {
  title: 'Tests/FirstSessionScreen',
  component: FirstSessionScreen,
  parameters: { trpc: sessionListMocks },
} satisfies Meta<typeof FirstSessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OpensFirstActiveSession: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(firstSessionId)).toBeVisible();
  },
};

export const OpensNewSessionWithoutSessions: Story = {
  parameters: { trpc: { ...emptySessionListMocks, ...newSessionMocks } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('textbox', { name: 'Message' }),
    ).toBeVisible();
  },
};
