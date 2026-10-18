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

const switchRoot = WireNode.parse(
  fixtures.find((node) => node.type === 'Switch'),
);

const onEvent = fn();

function PatchedSwitch(): React.JSX.Element {
  const [root, setRoot] = useState(switchRoot);

  return (
    <PluginTree
      root={root}
      onEvent={(key, interaction) => {
        setRoot({ ...root, props: { ...root.props, value: true } });

        return onEvent(key, interaction);
      }}
    />
  );
}

export const ServerPatchBeforeRejection: Story = {
  render: PatchedSwitch,
  play: async ({ canvas, userEvent }) => {
    const response = Promise.withResolvers<void>();
    onEvent.mockReturnValueOnce(response.promise);
    const toggle = canvas.getByRole('switch', { name: 'Notifications' });
    await userEvent.click(toggle);
    await expect(toggle).toBeChecked();
    await expect(toggle).toHaveAttribute('aria-disabled', 'true');
    response.reject(new Error('Handler failed'));
    await waitFor(() => expect(toggle).not.toBeChecked());
  },
};

const slider = (): React.JSX.Element => (
  <PluginTree root={sliderRoot} onEvent={onEvent} />
);

function overlapping(newerFirst: boolean): Story {
  return {
    render: slider,
    play: async ({ canvas }) => {
      const first = Promise.withResolvers<void>();
      const second = Promise.withResolvers<void>();
      onEvent
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const range = canvas.getByRole('slider', { name: 'Concurrency' });
      await fireEvent.change(range, { target: { value: '7' } });
      await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1));
      await fireEvent.change(range, { target: { value: '8' } });
      await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(2));

      if (newerFirst) {
        second.reject(new Error('Newer edit failed'));
        await waitFor(() => expect(range).toHaveValue('7'));
        first.resolve();
      } else {
        first.resolve();
        second.reject(new Error('Newer edit failed'));
      }

      await waitFor(() => expect(range).toHaveValue('7'));
    },
  };
}

export const NewerRejectionArrivesFirst = overlapping(true);

export const OlderAcceptanceArrivesFirst = overlapping(false);

export const FailedCoalescedEditRestoresValue: Story = {
  render: slider,
  play: async ({ canvas }) => {
    onEvent.mockRejectedValueOnce(new Error('Handler failed'));
    const slider = canvas.getByRole('slider', { name: 'Concurrency' });
    await fireEvent.change(slider, { target: { value: '7' } });
    await fireEvent.change(slider, { target: { value: '8' } });
    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith('slider', {
        event: 'onValueChange',
        payload: 8,
      }),
    );
    await waitFor(() => expect(slider).toHaveValue('2'));
    await expect(onEvent).toHaveBeenCalledOnce();
  },
};
