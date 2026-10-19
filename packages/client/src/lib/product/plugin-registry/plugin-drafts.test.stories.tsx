import { WireNode } from '@repo/contracts/plugins/wire';
import fixtures from '@repo/mocks/plugins/controls.json' with { type: 'json' };
import page from '@repo/mocks/plugins/page.json' with { type: 'json' };
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

interface Draft {
  root: WireNode;
  label: string;
  key: string;
  // The control that reveals the field, such as a Page's search button.
  open?: string;
}

function PatchedDraft({ draft }: { draft: Draft }): React.JSX.Element {
  const [root, setRoot] = useState(draft.root);

  return (
    <PluginTree
      root={root}
      onEvent={(key, interaction) => {
        onEvent(key, interaction);
        setRoot({
          ...root,
          props: { ...root.props, value: 'Server replacement' },
        });
      }}
    />
  );
}

// The focused field keeps the user's draft when the Plugin's patch replaces its value.
function focusedDraft(draft: Draft): Story {
  return {
    render: () => <PatchedDraft draft={draft} />,
    play: async ({ canvas, userEvent }) => {
      if (draft.open)
        await userEvent.click(canvas.getByRole('button', { name: draft.open }));
      const field = canvas.getByRole('textbox', { name: draft.label });
      await userEvent.clear(field);
      await userEvent.type(field, localEdit);
      await waitFor(() =>
        expect(onEvent).toHaveBeenCalledWith(draft.key, {
          event: 'onChangeText',
          payload: localEdit,
        }),
      );
      await expect(field).toHaveFocus();
      await expect(field).toHaveValue(localEdit);
    },
  };
}

export const FocusedDraftSurvivesPatch = focusedDraft({
  root: textRoot(),
  label: projectName,
  key: 'textinput',
});

export const FocusedPageSearchSurvivesPatch = focusedDraft({
  root: WireNode.parse(page),
  label: 'Search Issues',
  key: 'page',
  open: 'Search Issues',
});

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
