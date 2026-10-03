import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { fails, pending } from '../../mocks/trpc-mock-link';
import { ProjectsScreen } from './ProjectsScreen';
import { projectsScreenMocks } from './ProjectsScreen.mocks';

const meta = {
  title: 'Tests/ProjectsScreen',
  component: ProjectsScreen,
  parameters: { trpc: projectsScreenMocks },
} satisfies Meta<typeof ProjectsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShowsServerInfoAndClock: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('1.2.3')).toBeVisible();
    await expect(canvas.getByText('2026-10-03T09:00:00.000Z')).toBeVisible();
    await expect(canvas.getByText('4242')).toBeVisible();
    await expect(
      await canvas.findByText('2026-10-03T10:00:00.000Z'),
    ).toBeVisible();
    // Uniwind's rounded-xl on the Card: --radius (10px) + 4px.
    const card = canvas
      .getByRole('heading', { name: 'Server' })
      .closest('[class*="rounded-xl"]');
    await expect(card).not.toBeNull();
    await expect(getComputedStyle(card as Element).borderTopLeftRadius).toBe(
      '14px',
    );
  },
};

export const ShowsNewestClockTick: Story = {
  parameters: {
    trpc: {
      'system.clock': async function* () {
        yield { now: '2026-10-03T10:00:00.000Z' };
        yield { now: '2026-10-03T10:00:01.000Z' };
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText('2026-10-03T10:00:01.000Z'),
    ).toBeVisible();
  },
};

export const ShowsLoadingUntilServerAnswers: Story = {
  parameters: {
    trpc: { 'system.info': pending(), 'system.clock': pending() },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Connecting to the Server…')).toBeVisible();
  },
};

export const ShowsSystemInfoError: Story = {
  parameters: {
    trpc: { 'system.info': fails('Server is down'), 'system.clock': pending() },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Server is down')).toBeVisible();
  },
};
