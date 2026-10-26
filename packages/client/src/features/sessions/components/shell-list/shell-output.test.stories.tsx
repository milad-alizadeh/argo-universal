import { eachLayout, layoutWidths } from '@repo/kit/each-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { useState, type JSX } from 'react';
import { expect, waitFor } from 'storybook/test';
import {
  failedShell,
  lostShell,
  noCodeShell,
  stoppedShell,
} from './shell-list.mocks';
import { ShellOutput, type ShellOutputProps } from './shell-output';
import {
  failedOutput,
  longRunningOutput,
  lostOutput,
  noCodeOutput,
  stoppedOutput,
} from './shell-output.mocks';
import outputMeta from './shell-output.stories';

const meta = { ...outputMeta, title: 'Tests/Sessions/ShellOutput' };

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const awayWait = { timeout: 15000, interval: 100 };

// The wheel turning up stops the list following its end, which setting scrollTop alone does not.
function scrollUp(scroll: HTMLElement): void {
  scroll.dispatchEvent(
    new WheelEvent('wheel', { deltaY: -scroll.clientHeight }),
  );
  scroll.scrollTop = 0;
  scroll.dispatchEvent(new Event('scroll'));
}

const jumpName = 'Jump to latest';

// Scrolling up offers Jump to latest.
async function scrollAway(canvas: Canvas): Promise<void> {
  const scroll = await canvas.findByTestId('shell-output');

  await waitFor(async () => {
    scrollUp(scroll);
    await expect(canvas.getByRole('button', { name: jumpName })).toBeVisible();
  }, awayWait);
}

// Jump to latest goes back to the end and hides itself.
const jumpsBackToTheEnd = (width: number): Story => ({
  args: { output: longRunningOutput },
  play: async ({ canvas, userEvent }) => {
    await settleViewport(width);
    await scrollAway(canvas);
    await userEvent.click(canvas.getByRole('button', { name: jumpName }));
    await waitFor(() =>
      expect(
        canvas.queryByRole('button', { name: /Jump to latest/ }),
      ).toBeNull(),
    );
  },
});

// Output that arrives while the reader is away from the end.
function GrowingOutput(props: ShellOutputProps): JSX.Element {
  const [arrived, setArrived] = useState(0);

  const output = props.output && {
    ...props.output,
    text: `${props.output.text}${'later line\n'.repeat(arrived)}`,
  };

  return (
    <>
      <ShellOutput {...props} output={output} />
      <Button label="Output more" onPress={() => setArrived((n) => n + 1)} />
    </>
  );
}

// New output while scrolled up marks Jump to latest with the new-rows dot.
export const JumpsToNewOutputWhileAway: Story = {
  args: { output: longRunningOutput },
  render: (args) => <GrowingOutput {...args} />,
  play: async ({ canvas, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await scrollAway(canvas);
    await userEvent.click(canvas.getByRole('button', { name: 'Output more' }));
    await expect(
      await canvas.findByRole('button', { name: `${jumpName}, new rows` }),
    ).toBeVisible();
  },
};

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
