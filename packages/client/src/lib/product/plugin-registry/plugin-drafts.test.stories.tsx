import { WireNode } from '@repo/contracts/plugins/wire';
import fixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const meta = { title: 'Tests/Plugin drafts' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onEvent = fn();

const projectName = 'Project name';

const localEdit = 'Local edit';

const roots = fixtures.map((fixture) => WireNode.parse(fixture));

function textRoot(): WireNode {
  const root = roots.find((node) => node.type === 'TextInput');

  if (!root) throw new Error('Missing TextInput fixture');

  return root;
}

function PatchedDraft(): React.JSX.Element {
  const [root, setRoot] = useState(textRoot);

  return (
    <PluginTree
      root={root}
      onEvent={(key, event) => {
        onEvent(key, event);
        setRoot({
          ...root,
          props: { ...root.props, value: 'Server replacement' },
        });
      }}
    />
  );
}

// The Server's value waits while the field has focus and shows once it blurs.
export const FocusedDraftSurvivesPatch: Story = {
  render: PatchedDraft,
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('textbox', { name: projectName });
    await userEvent.clear(field);
    await userEvent.type(field, localEdit);
    await waitFor(() =>
      expect(onEvent).toHaveBeenCalledWith('textinput', {
        event: 'onChangeText',
        payload: localEdit,
      }),
    );
    await expect(field).toHaveFocus();
    await expect(field).toHaveValue(localEdit);
    await userEvent.tab();
    await waitFor(() => expect(field).toHaveValue('Server replacement'));
  },
};

function LocalDraft(): React.JSX.Element {
  const root = textRoot();
  const props = { ...root.props };
  delete props.onChangeText;

  return <PluginTree root={{ ...root, props }} onEvent={onEvent} />;
}

export const DraftWithoutChangeHandler: Story = {
  render: LocalDraft,
  play: async ({ canvas, userEvent }) => {
    const field = canvas.getByRole('textbox', { name: projectName });
    await userEvent.clear(field);
    await userEvent.type(field, 'Private draft{Enter}');
    await expect(field).toHaveValue('Private draft');
    await expect(onEvent).toHaveBeenCalledOnce();
    await expect(onEvent).toHaveBeenCalledWith('textinput', {
      event: 'onSubmit',
    });
  },
};
