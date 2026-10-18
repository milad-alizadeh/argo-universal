import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, fireEvent, waitFor } from 'storybook/test';
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

export const FailedCoalescedEditRestoresValue: Story = {
  render: () => (
    <PluginTree
      root={node('Slider', 'range', {
        value: 2,
        minimumValue: 0,
        maximumValue: 10,
        step: 1,
        valueLabel: '2 jobs',
        accessibilityLabel: 'Concurrency',
        onValueChange: { $event: 'onValueChange' },
      })}
      onEvent={onEvent}
    />
  ),
  play: async ({ canvas }) => {
    onEvent.mockRejectedValueOnce(new Error('Handler failed'));
    const slider = canvas.getByRole('slider', { name: 'Concurrency' });
    await fireEvent.change(slider, { target: { value: '7' } });
    await fireEvent.change(slider, { target: { value: '8' } });
    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith('range', {
        event: 'onValueChange',
        payload: 8,
      }),
    );
    await waitFor(() => expect(slider).toHaveValue('2'));
    await expect(onEvent).toHaveBeenCalledOnce();
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
    const [first, second] = canvas.getAllByRole('button', { name: 'Argo' });
    if (!first || !second) throw new Error('Expected one Argo row per App');
    await userEvent.click(first);
    await expect(onEvent).toHaveBeenLastCalledWith('choices', {
      event: 'onSelectionChange',
      payload: ['argo'],
    });
    await userEvent.click(second);
    await expect(onEvent).toHaveBeenLastCalledWith('choices', {
      event: 'onSelectionChange',
      payload: ['argo'],
    });
    await userEvent.click(first);
    await expect(onEvent).toHaveBeenLastCalledWith('choices', {
      event: 'onSelectionChange',
      payload: [],
    });
  },
};
