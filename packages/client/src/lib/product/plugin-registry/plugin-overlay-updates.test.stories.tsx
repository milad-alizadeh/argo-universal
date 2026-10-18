import { WireNode } from '@repo/contracts/plugins/wire';
import fixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const root = WireNode.parse(fixture);

const delivered = fn();

const meta = { title: 'Tests/Plugin overlay updates' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const fieldName = 'Overlay name';

const openDialog = 'Open dialog';

const dialogTrigger = 'overlays/dialog-trigger';

function UpdatedDelivery(): React.JSX.Element {
  const [revision, update] = useState(1);

  return (
    <PluginTree
      root={root}
      onEvent={(key, interaction) => {
        delivered(revision, key, interaction);
        update(2);
      }}
    />
  );
}

export const CurrentDeliveryAfterEdit: Story = {
  render: UpdatedDelivery,
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: openDialog }));
    const field = await page.findByRole('textbox', { name: fieldName });
    await userEvent.clear(field);
    await userEvent.type(field, 'Atlas');
    await waitFor(() => expect(delivered).toHaveBeenCalled());
    await userEvent.click(page.getByRole('button', { name: 'Apply dialog' }));
    await expect(delivered).toHaveBeenLastCalledWith(2, dialogTrigger, {
      event: 'onAction',
      payload: { path: ['onPress', 'onConfirm'] },
    });
    await waitFor(() =>
      expect(page.queryByRole('textbox', { name: fieldName })).toBeNull(),
    );
  },
};

const onEvent = fn();

export const FailedDismissalCloses: Story = {
  render: (): React.JSX.Element => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: openDialog }));
    const cancel = await page.findByRole('button', { name: 'Cancel dialog' });
    const answer = Promise.withResolvers<void>();
    onEvent.mockReturnValueOnce(answer.promise);
    await userEvent.click(cancel);
    await expect(cancel).toHaveAttribute('aria-busy', 'true');
    answer.reject(new Error('Dismiss handler failed'));
    await waitFor(() =>
      expect(page.queryByRole('textbox', { name: fieldName })).toBeNull(),
    );
    await expect(onEvent).toHaveBeenCalledOnce();
  },
};

export const FlushBeforeConfirm: Story = {
  render: (): React.JSX.Element => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ canvas, userEvent }) => {
    const page = within(document.body);
    await userEvent.click(canvas.getByRole('button', { name: openDialog }));
    const field = await page.findByRole('textbox', { name: fieldName });
    await fireEvent.change(field, { target: { value: 'Atlas' } });
    await userEvent.click(page.getByRole('button', { name: 'Apply dialog' }));
    await waitFor(() =>
      expect(page.queryByRole('textbox', { name: fieldName })).toBeNull(),
    );
    await expect(onEvent.mock.calls).toEqual([
      [
        dialogTrigger,
        {
          event: 'onAction',
          payload: {
            path: [
              'onPress',
              'content',
              'children',
              '0',
              'props',
              'onChangeText',
            ],
            value: 'Atlas',
          },
        },
      ],
      [
        dialogTrigger,
        { event: 'onAction', payload: { path: ['onPress', 'onConfirm'] } },
      ],
    ]);
  },
};
