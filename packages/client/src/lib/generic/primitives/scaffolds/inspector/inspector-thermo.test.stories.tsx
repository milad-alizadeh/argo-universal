import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fireEvent, waitFor } from 'storybook/test';
import { settleViewport } from '#lib/generic/settle-viewport';
import { LoadingPage } from './inspector-restore.test.mocks';

const meta = {
  title: 'Tests/InspectorRestore',
  component: LoadingPage,
  parameters: { screenPreview: true },
  beforeEach: (): Promise<void> => settleViewport(1440),
} satisfies Meta<typeof LoadingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

const scrollId = 'desktop-inspector-scroll';

const loadLabel = 'Load content';

async function loadedScroll(
  canvas: Parameters<NonNullable<Story['play']>>[0]['canvas'],
): Promise<HTMLElement> {
  const scroll = canvas.getByTestId(scrollId);

  await waitFor(() =>
    expect(scroll.scrollHeight - scroll.clientHeight).toBeGreaterThan(500),
  );

  return scroll;
}

export const RestoresAfterContentLoads: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('Loading content');
    await userEvent.click(canvas.getByRole('button', { name: loadLabel }));
    const scroll = await loadedScroll(canvas);

    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(400));
  },
};

export const WheelCancelsPendingRestore: Story = {
  play: async ({ canvas, userEvent }) => {
    const scroll = await canvas.findByTestId(scrollId);

    scroll.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 100, bubbles: true }),
    );
    await userEvent.click(canvas.getByRole('button', { name: loadLabel }));
    await loadedScroll(canvas);
    await expect(scroll.scrollTop).toBe(0);
  },
};

export const KeyboardCancelsPendingRestore: Story = {
  play: async ({ canvas, userEvent }) => {
    const scroll = await canvas.findByTestId(scrollId);

    await fireEvent.keyDown(scroll, { key: 'PageDown' });
    await userEvent.click(canvas.getByRole('button', { name: loadLabel }));
    await loadedScroll(canvas);
    await expect(scroll.scrollTop).toBe(0);
  },
};

export const ShortFinalContentSettlesWithoutLaterJump: Story = {
  args: { short: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: loadLabel }));
    await canvas.findByText('Loaded item 2');
    await canvas.findByText('Saved position 0');
    const scroll = canvas.getByTestId(scrollId);

    await expect(scroll.scrollTop).toBe(0);
    await userEvent.click(canvas.getByRole('button', { name: 'Grow content' }));
    await loadedScroll(canvas);
    await expect(scroll.scrollTop).toBe(0);
  },
};

export const ReadinessKeepsChildState: Story = {
  play: async ({ canvas, userEvent }) => {
    const note = await canvas.findByRole('textbox', { name: 'Detail note' });

    await userEvent.type(note, 'Keep this note');
    await userEvent.click(canvas.getByRole('button', { name: loadLabel }));
    await loadedScroll(canvas);
    await expect(
      canvas.getByRole('textbox', { name: 'Detail note' }),
    ).toHaveValue('Keep this note');
  },
};

export const RestoresWithoutAReadinessHint: Story = {
  args: { explicitReady: false },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByText('Loading content');
    await userEvent.click(canvas.getByRole('button', { name: loadLabel }));
    const scroll = await loadedScroll(canvas);

    await waitFor(() => expect(scroll.scrollTop).toBeGreaterThan(400));
  },
};
