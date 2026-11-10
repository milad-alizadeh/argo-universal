import { renderCounter } from '@repo/kit/mocks/render-counts';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, Profiler } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { createShellOutputStore } from '../../api/shell-output-buffer';
import type { ShellEntry } from './shell-list-types';
import { runningShell } from './shell-list.mocks';
import { ShellOutput } from './shell-output';
import outputMeta from './shell-output.stories';
import { ShellPanel } from './shell-panel';

const meta = { ...outputMeta, title: 'Tests/Sessions/ShellOutput/Renders' };

export default meta;

type Story = StoryObj<typeof meta>;

const renders = renderCounter();

const firstLine = 'first line';

// Each story starts a fresh store, as opening a Shell starts a fresh subscription.
const sent = { store: createShellOutputStore(), text: '', after: 0 };

// What the Server does with a Shell's output: each chunk adds to what was sent before.
function send(text: string): void {
  sent.text += text;
  sent.after += 1;
  sent.store.receive({
    shellId: runningShell.id,
    text: sent.text,
    after: sent.after,
  });
}

function reset(): void {
  sent.store = createShellOutputStore();
  sent.text = '';
  sent.after = 0;
  send(`${firstLine}\n`);
}

function ArrivingOutput(): JSX.Element {
  return (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <ShellOutput shell={runningShell} outputSource={sent.store} />
    </Profiler>
  );
}

const chunks = 5;

// Lines already drawn stay drawn as whole lines arrive: only the new rows mount.
export const WholeLinesDrawOnlyTheNewRows: Story = {
  render: () => <ArrivingOutput />,
  beforeEach: reset,
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('wide');
    await canvas.findByText(firstLine);

    const counts = await renders.during(canvasElement, async () => {
      for (let line = 1; line <= chunks; line += 1) {
        send(`line ${line}\n`);
        await canvas.findByText(`line ${line}`);
      }
    });

    await expect(counts.OutputLine?.mounts).toBe(chunks);
    await expect(counts.OutputLine?.updates).toEqual([]);
  },
};

// A line still being written redraws alone as it grows.
export const AGrowingLineRedrawsAlone: Story = {
  render: () => <ArrivingOutput />,
  beforeEach: reset,
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('wide');
    await canvas.findByText(firstLine);
    send('step');

    const counts = await renders.during(canvasElement, async () => {
      for (let dot = 1; dot <= chunks; dot += 1) {
        send('.');
        await canvas.findByText(`step${'.'.repeat(dot)}`);
      }
    });

    const drawn = (counts.OutputLine?.updates ?? []).map((props) =>
      JSON.stringify(props),
    );

    // React may draw two quick chunks as one.
    await expect(drawn.length).toBeGreaterThan(0);
    await expect(drawn.length).toBeLessThanOrEqual(chunks);
    await expect(drawn.every((props) => props.includes('step'))).toBe(true);
  },
};

// Started now, so its running time reads in seconds and visibly ticks.
const justStarted = (): ShellEntry => ({
  ...runningShell,
  startedAt: Date.now(),
});

// The header's running time ticks on its own: the output under it does not draw again.
export const TheClockLeavesTheOutputAlone: Story = {
  render: () => (
    <Profiler id={renders.id} onRender={renders.onRender}>
      <ShellPanel
        shells={[justStarted()]}
        openId={runningShell.id}
        outputSource={sent.store}
        onStop={fn()}
        listScrolls
      />
    </Profiler>
  ),
  beforeEach: reset,
  play: async ({ canvas, canvasElement }) => {
    await settleLayout('wide');
    await canvas.findByText(firstLine);
    const running = canvas.getByText(/^Running · /);
    const before = running.textContent;

    const counts = await renders.during(canvasElement, () =>
      waitFor(() => expect(running.textContent).not.toBe(before), {
        timeout: 3000,
      }),
    );

    await expect(counts.ShellOutputHeader?.updates.length).toBeGreaterThan(0);
    await expect(counts.OutputLines).toBeUndefined();
    await expect(counts.OutputLine).toBeUndefined();
  },
};
