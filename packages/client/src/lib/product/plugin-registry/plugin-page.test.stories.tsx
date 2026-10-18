import { WireNode } from '@repo/contracts/plugins/wire';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import fixture from './plugin-page.fixture.json';
import { PluginTree } from './plugin-registry';

const root = WireNode.parse(fixture);

const onEvent = fn();

const searchLabel = 'Search Issues';

const meta = { title: 'Tests/Plugin registry/Page' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DispatchAndDraft: Story = {
  render: () => <PatchedPage />,
  play: async ({ canvas, userEvent }) => {
    onEvent.mockClear();
    await expect(canvas.getByRole('heading', { name: 'Issues' })).toBeVisible();
    await expect(canvas.getByText('Open Issues')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }));
    await expect(onEvent).toHaveBeenLastCalledWith(
      'page#actions/actions/filters',
      { event: 'onPress' },
    );
    await userEvent.click(canvas.getByRole('button', { name: 'New Issue' }));
    await expect(onEvent).toHaveBeenLastCalledWith('page', {
      event: 'onAction',
      payload: { path: ['primaryAction', 'onPress'], value: undefined },
    });
    await userEvent.click(canvas.getByRole('button', { name: searchLabel }));
    await userEvent.type(
      canvas.getByRole('textbox', { name: searchLabel }),
      'regression',
    );
    await expect(
      canvas.getByRole('textbox', { name: searchLabel }),
    ).toHaveValue('regression');
    await waitFor(() =>
      expect(onEvent).toHaveBeenLastCalledWith('page', {
        event: 'onChangeText',
        payload: 'regression',
      }),
    );
    await canvas.findByText('Updated Issues');
    await expect(
      canvas.getByRole('textbox', { name: searchLabel }),
    ).toHaveFocus();
    await expect(
      canvas.getByRole('textbox', { name: searchLabel }),
    ).toHaveValue('regression');
    await userEvent.click(canvas.getByRole('button', { name: 'Close search' }));
    await waitFor(() =>
      expect(onEvent).toHaveBeenLastCalledWith('page', {
        event: 'onChangeText',
        payload: '',
      }),
    );
  },
};

function PatchedPage(): React.JSX.Element {
  const [tree, setTree] = useState(root);

  return (
    <PluginTree
      root={tree}
      onEvent={(key, interaction) => {
        onEvent(key, interaction);

        if (interaction.event === 'onChangeText')
          setTree({
            ...root,
            props: {
              ...root.props,
              value: 'Server replacement',
              title: 'Updated Issues',
            },
          });
      }}
    />
  );
}
