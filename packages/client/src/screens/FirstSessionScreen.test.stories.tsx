import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { newSessionMocks } from '../../mocks/new-session-mock';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../mocks/session-list-mock';
import { idleSessionMocks } from '../../mocks/session-screen-mock';
import { FirstSessionScreen } from './FirstSessionScreen';

const meta = {
  title: 'Tests/FirstSessionScreen',
  component: FirstSessionScreen,
  parameters: { trpc: { ...sessionListMocks, ...idleSessionMocks } },
} satisfies Meta<typeof FirstSessionScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OpensFirstActiveSession: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('textbox', { name: 'Message' }),
    ).toBeVisible();
    await expect(canvas.getByText('Redraws')).toBeInTheDocument();
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
