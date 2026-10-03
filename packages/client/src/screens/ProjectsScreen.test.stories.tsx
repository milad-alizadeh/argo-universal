import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
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
