import { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useEffect, useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/KeptControls',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const toggle = (key: string, value = false): WireNode => ({
  type: 'FieldGroup.Toggle',
  key,
  props: { title: `Toggle ${key}`, value, onValueChange: { bind: key } },
  children: [],
  slots: {},
});

const text = (value: string): WireNode => ({
  type: 'FieldGroup.TextField',
  key: 'name',
  props: { title: 'Project name', value, onChangeText: { bind: 'name' } },
  children: [],
  slots: {},
});

const section = (fields: WireNode[]): WireNode => ({
  type: 'FieldGroup.Section',
  key: 'section',
  props: {},
  slots: {},
  children: fields,
});

const form = (children: WireNode[]): WireNode => ({
  type: 'FieldGroup',
  key: 'form',
  props: {},
  slots: {},
  children,
});

const fields = [toggle('a'), toggle('b'), text('Argo')];

const first = form([section(fields)]);

// What the Server sends next: the fields it did not change are the same nodes as before.
const withFields = (replaced: Record<string, WireNode>): WireNode =>
  form([section(fields.map((field) => replaced[field.key] ?? field))]);

const onPageCall = fn(async () => {});

// The page hands the story its way to send a tree, as a Server's new answer would arrive.
const server = { sends: fn<(root: WireNode) => void>() };

function Page(): React.JSX.Element {
  const [root, setRoot] = useState(first);
  useEffect(() => {
    server.sends.mockImplementation(setRoot);
  }, []);

  return <PluginTree root={root} onPageCall={onPageCall} />;
}

// A field echoes its edit at once and rolls it back when refused, and the fields kept beside it are left as they were.
export const RefusedEchoLeavesKeptSiblingsAlone: Story = {
  render: () => <Page />,
  play: async ({ canvas, userEvent }) => {
    onPageCall.mockClear();
    const a = canvas.getByRole('switch', { name: 'Toggle a' });
    const b = canvas.getByRole('switch', { name: 'Toggle b' });
    const refused = Promise.withResolvers<void>();
    onPageCall.mockReturnValueOnce(refused.promise);

    await userEvent.click(canvas.getByText('Toggle a'));
    await expect(a).toBeChecked();
    await expect(a).toBeDisabled();
    await expect(b).not.toBeChecked();
    await expect(b).not.toBeDisabled();

    refused.reject(new Error('Refused'));
    await waitFor(() => expect(a).not.toBeChecked());
    await expect(a).not.toBeDisabled();

    await userEvent.click(canvas.getByText('Toggle b'));
    await waitFor(() => expect(b).toBeChecked());
    await expect(a).not.toBeChecked();
  },
};

// The Server's new value for one field shows, and the fields kept beside it stay.
export const ServerValueReachesOneKeptField: Story = {
  render: () => <Page />,
  play: async ({ canvas }) => {
    server.sends(withFields({ a: toggle('a', true) }));

    await waitFor(() =>
      expect(canvas.getByRole('switch', { name: 'Toggle a' })).toBeChecked(),
    );
    await expect(
      canvas.getByRole('switch', { name: 'Toggle b' }),
    ).not.toBeChecked();
  },
};

// A focused field keeps its draft over the Server's value, and shows the Server's value when focus leaves.
export const DraftClearsWhenFocusLeaves: Story = {
  render: () => <Page />,
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('textbox', { name: 'Project name' });
    await userEvent.type(field, ' draft');
    await expect(field).toHaveValue('Argo draft');

    server.sends(withFields({ name: text('Renamed') }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(field).toHaveValue('Argo draft');

    await userEvent.tab();
    await waitFor(() => expect(field).toHaveValue('Renamed'));
  },
};
