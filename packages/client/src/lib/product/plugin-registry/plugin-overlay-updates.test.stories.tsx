import { WireNode } from '@repo/contracts/plugins/wire';
import { applyPatch } from '@repo/contracts/plugins/wire-patch';
import fixture from '@repo/mocks/plugins/overlays.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within, fireEvent } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const root = applyPatch(WireNode.parse(fixture), [
  { op: 'setProps', key: ['sheet'], props: { open: true } },
]);

const delivered = fn();

const meta = { title: 'Tests/Plugin overlay updates' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const fieldName = 'Overlay name';

const field = 'overlays/sheet/body/field';

const apply = 'overlays/sheet/body/apply';

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
  play: async ({ userEvent }) => {
    const page = within(document.body);
    const input = await page.findByRole('textbox', { name: fieldName });
    await userEvent.clear(input);
    await userEvent.type(input, 'Atlas');
    await waitFor(() => expect(delivered).toHaveBeenCalled());
    await userEvent.click(page.getByRole('button', { name: 'Apply sheet' }));
    await waitFor(() =>
      expect(delivered).toHaveBeenLastCalledWith(2, apply, {
        event: 'onPress',
      }),
    );
  },
};

const onEvent = fn();

export const FlushBeforeConfirm: Story = {
  render: (): React.JSX.Element => <PluginTree root={root} onEvent={onEvent} />,
  play: async ({ userEvent }) => {
    const page = within(document.body);
    const input = await page.findByRole('textbox', { name: fieldName });
    await fireEvent.change(input, { target: { value: 'Atlas' } });
    await userEvent.click(page.getByRole('button', { name: 'Apply sheet' }));
    await waitFor(() =>
      expect(onEvent.mock.calls).toEqual([
        [field, { event: 'onChangeText', payload: 'Atlas' }],
        [apply, { event: 'onPress' }],
      ]),
    );
  },
};
