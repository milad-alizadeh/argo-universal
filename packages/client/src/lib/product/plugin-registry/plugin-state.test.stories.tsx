import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = { title: 'Tests/Plugin state' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onEvent = fn();

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({ type, key, props, children: [], slots: {} });

const text = node('TextInput', 'name', {
  label: 'Name',
  value: 'Argo',
  onChangeText: { $event: 'onChangeText' },
});

let patch = Promise.withResolvers<void>();

function DelayedPatch(): React.JSX.Element {
  const [root, setRoot] = useState(text);

  return (
    <>
      <PluginTree root={root} onEvent={onEvent} />
      <PluginTree
        root={node('Button', 'patch', {
          label: 'Patch',
          onPress: { $event: 'onPress' },
        })}
        onEvent={async () => {
          await patch.promise;
          setRoot({
            ...text,
            props: { ...text.props, value: 'Server replacement' },
          });
        }}
      />
    </>
  );
}

export const FocusedFieldWaitsForBlur: Story = {
  beforeEach: () => {
    patch = Promise.withResolvers<void>();
  },
  render: DelayedPatch,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Patch' }));
    const field = canvas.getByRole('textbox', { name: 'Name' });
    await userEvent.click(field);
    patch.resolve();
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: 'Patch' })).toBeEnabled(),
    );
    await expect(field).toHaveFocus();
    await expect(field).toHaveValue('Argo');
    await userEvent.tab();
    await waitFor(() => expect(field).toHaveValue('Server replacement'));
  },
};

const section: WireNode = {
  ...node('List.Section', 'choices', {
    selectionMode: 'multiple',
    selection: [],
    onSelectionChange: { $event: 'onSelectionChange' },
  }),
  children: [node('ListItem', 'argo', { id: 'argo', title: 'Argo' })],
};

export const AppsKeepSelectionIndependent: Story = {
  render: () => (
    <>
      <PluginTree root={section} onEvent={onEvent} />
      <PluginTree root={section} onEvent={onEvent} />
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    const rows = canvas.getAllByRole('button', { name: 'Argo' });
    await expect(rows).toHaveLength(2);

    for (const [index, payload] of [
      [0, ['argo']],
      [1, ['argo']],
      [0, []],
    ] as const) {
      const row = rows[index];

      if (!row) throw new Error('Expected an Argo row in this App');
      await userEvent.click(row);
      await expect(onEvent).toHaveBeenLastCalledWith('choices', {
        event: 'onSelectionChange',
        payload,
      });
    }
  },
};
