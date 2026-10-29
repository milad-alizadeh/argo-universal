import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { cdp, userEvent as browserUser } from 'vitest/browser';
import { WorkbenchScaffold } from './scaffold-workbench.mocks';

const meta = {
  title: 'Tests/Frame/Scaffold/Workbench',
  component: WorkbenchScaffold,
  parameters: { screenPreview: true },
} satisfies Meta<typeof WorkbenchScaffold>;

export default meta;

type Story = StoryObj<typeof meta>;

const workbenchId = 'desktop-workbench';

const toggleLabel = 'Toggle Workbench';

export const FloatingKeepsTheFeedInPlace: Story = {
  args: { inspectorOpen: true },
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    const feed = await canvas.findByTestId('workbench-feed');
    const bounds = feed.getBoundingClientRect();
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await expect(
      canvas.getByRole('button', { name: toggleLabel }),
    ).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(canvas.getByRole('button', { name: toggleLabel }));
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await expect(
      canvas.getByRole('button', { name: toggleLabel }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(feed.getBoundingClientRect()).toEqual(bounds);
    await expect(canvas.queryByRole('dialog')).toBeNull();
    await expect(
      canvas.queryByRole('separator', { name: 'Resize Workbench' }),
    ).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: toggleLabel }));
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await expect(canvas.getByRole('textbox', { name: 'Draft' })).toHaveValue(
      'Keep my draft',
    );
  },
};

export const NarrowingAutoHidesTheDockedWorkbench: Story = {
  args: { inspectorOpen: true },
  play: async ({ canvas, userEvent }) => {
    await settleLayout(1768);
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await settleLayout('wide');
    await waitFor(() =>
      expect(canvas.getByTestId(workbenchId)).not.toBeVisible(),
    );
    await userEvent.click(canvas.getByRole('button', { name: toggleLabel }));
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await expect(canvas.getByRole('textbox', { name: 'Draft' })).toHaveValue(
      'Keep my draft',
    );
  },
};

export const CardOpensTheInspectorWithoutClosingTheOverview: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout(1920);
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
    await userEvent.click(canvas.getByRole('button', { name: 'Changes' }));
    await expect(await canvas.findByText('Branch files')).toBeVisible();
    await waitFor(() => expect(canvas.getByTestId(workbenchId)).toBeVisible());
  },
};

export const OverflowCardsKeepTheirOwnScrollTarget: Story = {
  args: { overflowing: true },
  beforeEach: (): Promise<void> => settleLayout(1920),
  play: async ({ canvas }) => {
    const scroll = await canvas.findByRole('region', {
      name: 'Workbench overview',
    });

    const card = canvas.getByRole('button', { name: 'Section 1' });
    await browserUser.hover(card);

    const box = card.getBoundingClientRect();
    await cdp().send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: box.left + box.width / 2,
      y: box.top + box.height / 2,
      deltaX: 0,
      deltaY: 300,
    });
    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(0));
  },
};
