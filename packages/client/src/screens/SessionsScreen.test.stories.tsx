import { activeSessions } from '@repo/api/mocks';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import {
  emptySessionListMocks,
  sessionListMocks,
} from '../../mocks/session-list-mock';
import { SessionsScreen } from './SessionsScreen';

const firstSessionId = activeSessions.sessions[0]?.sessionId ?? '';

const meta = {
  title: 'Tests/SessionsScreen',
  component: SessionsScreen,
  parameters: { trpc: sessionListMocks },
} satisfies Meta<typeof SessionsScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WideOpensFirstActiveSession: Story = {
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    await expect(await canvas.findByText(firstSessionId)).toBeVisible();
    await expect(canvas.queryByText('Sessions will appear here.')).toBeNull();
  },
};

export const WideOpensNewSessionWithoutSessions: Story = {
  parameters: { trpc: emptySessionListMocks },
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(1440, 844);
    await expect(
      await canvas.findByText('Starting a Session will appear here.'),
    ).toBeVisible();
  },
};

export const PhoneShowsTheList: Story = {
  play: async ({ canvas }) => {
    const { page } = await import('vitest/browser');
    await page.viewport(390, 844);
    await expect(
      await canvas.findByText('Sessions will appear here.'),
    ).toBeVisible();
    await expect(canvas.queryByText(firstSessionId)).toBeNull();
  },
};
