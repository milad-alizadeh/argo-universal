import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { page } from 'vitest/browser';
import { WorkbenchScaffold } from './scaffold-workbench.mocks';

const meta = {
  title: 'Tests/Scaffold/Workbench',
  component: WorkbenchScaffold,
  parameters: { screenPreview: true },
} satisfies Meta<typeof WorkbenchScaffold>;

export default meta;

type Story = StoryObj<typeof meta>;

const workbenchId = 'desktop-workbench';

export const FloatingKeepsTheFeedInPlace: Story = {
  args: { stageOpen: true },
  play: async ({ canvas, userEvent }) => {
    await page.viewport(1440, 844);
    const feed = await canvas.findByTestId('workbench-feed');
    const bounds = feed.getBoundingClientRect();
    await expect(canvas.queryByTestId(workbenchId)).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Show Workbench' }),
    );
    await expect(await canvas.findByTestId(workbenchId)).toBeVisible();
    await expect(feed.getBoundingClientRect()).toEqual(bounds);
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(
      canvas.queryByRole('separator', { name: 'Resize Workbench' }),
    ).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Hide Workbench' }),
    );
    await expect(canvas.queryByTestId(workbenchId)).toBeNull();
    await expect(canvas.getByRole('textbox', { name: 'Draft' })).toHaveValue(
      'Keep my draft',
    );
  },
};

export const NarrowingAutoHidesTheDockedWorkbench: Story = {
  args: { stageOpen: true },
  play: async ({ canvas, userEvent }) => {
    await page.viewport(1768, 844);
    await expect(await canvas.findByTestId(workbenchId)).toBeVisible();
    await page.viewport(1440, 844);
    await waitFor(() => expect(canvas.queryByTestId(workbenchId)).toBeNull());
    await userEvent.click(
      canvas.getByRole('button', { name: 'Show Workbench' }),
    );
    await expect(await canvas.findByTestId(workbenchId)).toBeVisible();
    await expect(canvas.getByRole('textbox', { name: 'Draft' })).toHaveValue(
      'Keep my draft',
    );
  },
};

export const CardOpensTheStageWithoutClosingTheOverview: Story = {
  play: async ({ canvas, userEvent }) => {
    await page.viewport(1920, 844);
    await expect(await canvas.findByTestId(workbenchId)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Changes' }));
    await expect(await canvas.findByText('Branch files')).toBeVisible();
    await expect(canvas.getByTestId(workbenchId)).toBeVisible();
  },
};
