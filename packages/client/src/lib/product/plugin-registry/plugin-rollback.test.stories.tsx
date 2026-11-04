import { WireNode } from '@repo/contracts/plugins/wire';
import fixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, fireEvent, waitFor } from 'storybook/test';
import type { OnPageCall } from './plugin-registry';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Rollback',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const sliderRoot = WireNode.parse(
  fixtures.find((node) => node.type === 'Slider'),
);

const onPageCall = fn<OnPageCall>(async () => {});

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
    onPageCall.mockReturnValueOnce(reply.promise);
    await fireEvent.change(range, { target: { value: String(7 + index) } });
    await waitFor(() => expect(onPageCall).toHaveBeenCalledTimes(index + 1));
  }
}

// The Plugin clamps an edit to 5 with a patch before it answers.
function ClampedSlider(): React.JSX.Element {
  const [root, setRoot] = useState(sliderRoot);

  return (
    <PluginTree
      root={root}
      onPageCall={(call, event) => {
        setRoot({ ...sliderRoot, props: { ...sliderRoot.props, value: 5 } });

        return onPageCall(call, event);
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
      onPageCall.mockReturnValueOnce(reply.promise);
      const range = canvas.getByRole('slider', concurrency);
      await fireEvent.change(range, { target: { value: '7' } });
      await waitFor(() => expect(onPageCall).toHaveBeenCalledOnce());
      await expect(range).toHaveValue('7');
      settle(reply, accepted);
      await waitFor(() => expect(range).toHaveValue('5'));
    },
  };
}

export const ServerPatchBeforeRejection = serverPatch(false);

export const ServerPatchBeforeAcceptance = serverPatch(true);

const slider = (): React.JSX.Element => (
  <PluginTree root={sliderRoot} onPageCall={onPageCall} />
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
