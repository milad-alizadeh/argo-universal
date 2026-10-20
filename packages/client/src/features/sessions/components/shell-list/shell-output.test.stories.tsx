import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { eachLayout, layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import {
  failedShell,
  lostShell,
  noCodeShell,
  stoppedShell,
} from './shell-list.mocks';
import {
  failedOutput,
  longRunningOutput,
  lostOutput,
  noCodeOutput,
  stoppedOutput,
} from './shell-output.mocks';
import outputMeta from './shell-output.stories';

const meta = { ...outputMeta, title: 'Tests/ShellOutput' };

export default meta;

type Story = StoryObj<typeof meta>;

const awayWait = { timeout: 15000, interval: 100 };

// The wheel turning up stops the list following its end, which setting scrollTop alone does not.
function scrollUp(scroll: HTMLElement): void {
  scroll.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -scroll.clientHeight }),
  );
  scroll.scrollTop = 0;
  scroll.dispatchEvent(new Event('scroll'));
}

// Scrolling up offers Jump to latest, which goes back to the end and hides itself.
const jumpsBackToTheEnd = (width: number): Story => ({
  args: { output: longRunningOutput },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(width);
    const scroll = await canvas.findByTestId('shell-output');
    await waitFor(async () => {
      scrollUp(scroll);
      await expect(
        canvas.getByRole('button', { name: 'Jump to latest' }),
      ).toBeVisible();
    }, awayWait);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Jump to latest' }),
    );
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: /Jump to latest/ }),
      ).toBeNull(),
    );
  },
});

export const JumpsBackToTheEndOnAPhone = jumpsBackToTheEnd(layoutWidths.phone);

export const JumpsBackToTheEndWhenWide = jumpsBackToTheEnd(layoutWidths.wide);

// Output loaded for another Shell is not this one's: the view waits rather than showing it.
export const IgnoresAnotherShellsOutput: Story = {
  args: { output: failedOutput },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.queryByText(/earlier lines not kept/)).toBeNull();
      await expect(canvas.queryByText(/Using Vite builder/)).toBeNull();
    }),
};

export const ShowsTheCommandAndFolder: Story = {
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getByText('$')).toBeVisible();
      await expect(canvas.getByText('~/argo-universal/apps/app')).toBeVisible();
      await expect(canvas.queryByText(/^after /)).toBeNull();
    }),
};

// The footer reports an exit code, and the header says how many earlier lines the Server dropped.
export const Exited: Story = {
  args: { shell: failedShell, output: failedOutput },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getByText('Exit 1')).toBeVisible();
      await expect(canvas.getByText('after 8s')).toBeVisible();
      await expect(
        canvas.getByText('312 earlier lines not kept'),
      ).toBeVisible();
    }),
};

// A stopped Shell has no exit code: the footer says it was stopped and how long it ran.
export const Stopped: Story = {
  args: { shell: stoppedShell, output: stoppedOutput },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getByText('Stopped')).toBeVisible();
      await expect(canvas.getByText('after 2m 14s')).toBeVisible();
      await expect(canvas.queryByText(/^Exit /)).toBeNull();
    }),
};

// An exit the Agent reported without a code reads neutrally, with no outcome glyph.
export const ExitedWithoutACode: Story = {
  args: { shell: noCodeShell, output: noCodeOutput },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getByText('Exited')).toBeVisible();
      await expect(canvas.getByText('after 8s')).toBeVisible();
      await expect(canvas.queryByText(/^Exit /)).toBeNull();
    }),
};

// A lost Shell was never timed to an end: the footer says what became of it instead.
export const Lost: Story = {
  args: { shell: lostShell, output: lostOutput },
  play: async ({ canvas }) =>
    eachLayout(async () => {
      await expect(canvas.getByText('Lost')).toBeVisible();
      await expect(canvas.getByText('when the Server restarted')).toBeVisible();
      await expect(canvas.queryByText(/^after /)).toBeNull();
    }),
};
