import { WireNode } from '@repo/contracts/plugins/wire';
import fixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, fireEvent, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = { title: 'Tests/Plugin rollback' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const sliderRoot = WireNode.parse(
  fixtures.find((node) => node.type === 'Slider'),
);

const onEvent = fn();

const concurrency = { name: 'Concurrency' };

function settle(reply: PromiseWithResolvers<void>, ok: boolean): void {
  if (ok) reply.resolve();
  else reply.reject(new Error('Handler failed'));
}

// Sends 7, then 8, then 9, each once the one before reached the Plugin, each answered by its reply.
async function editInTurn(
  range: HTMLElement,
  replies: PromiseWithResolvers<void>[],
): Promise<void> {
  for (const [index, reply] of replies.entries()) {
    onEvent.mockReturnValueOnce(reply.promise);
    await fireEvent.change(range, { target: { value: String(7 + index) } });
    await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(index + 1));
  }
}

// The Plugin clamps an edit to 5 with a patch before it answers.
function ClampedSlider(): React.JSX.Element {
  const [root, setRoot] = useState(sliderRoot);

  return (
    <PluginTree
      root={root}
      onEvent={(key, event) => {
        setRoot({ ...sliderRoot, props: { ...sliderRoot.props, value: 5 } });

        return onEvent(key, event);
      }}
    />
  );
}

// Whether the Plugin accepts or refuses the edit, the field ends on the Server's newer value.
function serverPatch(accepted: boolean): Story {
  return {
    render: ClampedSlider,
    play: async ({ canvas }) => {
      const reply = Promise.withResolvers<void>();
      onEvent.mockReturnValueOnce(reply.promise);
      const range = canvas.getByRole('slider', concurrency);
      await fireEvent.change(range, { target: { value: '7' } });
      await waitFor(() => expect(onEvent).toHaveBeenCalledOnce());
      await expect(range).toHaveValue('7');
      settle(reply, accepted);
      await waitFor(() => expect(range).toHaveValue('5'));
    },
  };
}

export const ServerPatchBeforeRejection = serverPatch(false);

export const ServerPatchBeforeAcceptance = serverPatch(true);

const slider = (): React.JSX.Element => (
  <PluginTree root={sliderRoot} onEvent={onEvent} />
);

// Edits 7, 8 and 9 in turn; each step settles one of them and names what the slider shows after it.
type Step = { edit: number; ok: boolean; shows: string };

function overlapping(steps: Step[]): Story {
  return {
    render: slider,
    play: async ({ canvas }) => {
      const replies = steps.map(() => Promise.withResolvers<void>());
      const range = canvas.getByRole('slider', concurrency);
      await editInTurn(range, replies);

      for (const { edit, ok, shows } of steps) {
        settle(replies.at(edit) ?? Promise.withResolvers(), ok);
        await waitFor(() => expect(range).toHaveValue(shows));
      }
    },
  };
}

export const NewerRejectionArrivesFirst = overlapping([
  { edit: 1, ok: false, shows: '7' },
  { edit: 0, ok: true, shows: '7' },
]);

export const OlderAcceptanceArrivesFirst = overlapping([
  { edit: 0, ok: true, shows: '8' },
  { edit: 1, ok: false, shows: '7' },
]);

export const OlderFailureArrivesFirst = overlapping([
  { edit: 0, ok: false, shows: '8' },
  { edit: 1, ok: false, shows: '2' },
]);

export const InterleavedFailuresRestoreValue = overlapping([
  { edit: 1, ok: false, shows: '9' },
  { edit: 0, ok: false, shows: '9' },
  { edit: 2, ok: false, shows: '2' },
]);

export const FailedCoalescedEditRestoresValue: Story = {
  render: slider,
  play: async ({ canvas }) => {
    onEvent.mockRejectedValueOnce(new Error('Handler failed'));
    const range = canvas.getByRole('slider', concurrency);
    await fireEvent.change(range, { target: { value: '7' } });
    await fireEvent.change(range, { target: { value: '8' } });
    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith('slider', {
        event: 'onValueChange',
        payload: 8,
      }),
    );
    await waitFor(() => expect(range).toHaveValue('2'));
    await expect(onEvent).toHaveBeenCalledOnce();
  },
};
