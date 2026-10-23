import { WireNode } from '@repo/contracts/plugins/wire';
import page from '@repo/mocks/plugins/page.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';
import { textFieldNode } from './plugin-registry-fixtures';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Drafts',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onEvent = fn();

const projectName = 'Project name';

const localEdit = 'Local edit';

// The fixture's TextField row, drawn on its own as a draft.
function textRoot(): WireNode {
  return textFieldNode();
}

interface Draft {
  root: WireNode;
  label: string;
  key: string;
}

function PatchedDraft({ draft }: { draft: Draft }): React.JSX.Element {
  const [root, setRoot] = useState(draft.root);

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

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

// The focused field keeps the user's draft when the Plugin's patch replaces its value.
async function editFocusedDraft(
  { canvas, userEvent }: PlayContext,
  draft: Draft,
): Promise<HTMLElement> {
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

  return field;
}

const textDraft = { root: textRoot(), label: projectName, key: 'textinput' };

// The Server's value waits while the field has focus and shows once it blurs.
export const FocusedDraftSurvivesPatch: Story = {
  render: () => <PatchedDraft draft={textDraft} />,
  play: async (context) => {
    const field = await editFocusedDraft(context, textDraft);
    field.blur();
    await waitFor(() => expect(field).toHaveValue('Server replacement'));
  },
};

const searchDraft = {
  root: WireNode.parse(page),
  label: 'Search Issues',
  key: 'page',
};

// A Page's search field shows once its search button is pressed.
export const FocusedPageSearchSurvivesPatch: Story = {
  render: () => <PatchedDraft draft={searchDraft} />,
  play: async (context) => {
    const { canvas, userEvent } = context;
    await userEvent.click(
      canvas.getByRole('button', { name: searchDraft.label }),
    );
    await editFocusedDraft(context, searchDraft);
  },
};
