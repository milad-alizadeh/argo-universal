import type { PluginInteraction } from '@repo/contracts/plugins/wire';
import { WireNode } from '@repo/contracts/plugins/wire';
import fixture from '@repo/mocks/plugins/page.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor } from 'storybook/test';
import { PluginTree } from './plugin-registry';

const root = WireNode.parse(fixture);

const onEvent = fn();

const searchLabel = 'Search Issues';

const newIssue = 'New Issue';

const disabledAttribute = 'aria-disabled';

const meta = {
  title: 'Tests/Plugin registry/Page',
  render: (): React.JSX.Element => <PluginTree root={root} onEvent={onEvent} />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DrawsTitleAndContent: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Issues' })).toBeVisible();
    await expect(canvas.getByText('Open Issues')).toBeVisible();
  },
};

// A header Action dispatches from its own node; the primary Action is a nested prop of the Page.
function headerAction(
  name: string,
  key: string,
  interaction: PluginInteraction,
): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      onEvent.mockClear();
      await userEvent.click(canvas.getByRole('button', { name }));
      await expect(onEvent).toHaveBeenLastCalledWith(key, interaction);
    },
  };
}

export const FiltersActionDispatchesItsEvent = headerAction(
  'Filters',
  'page#actions/actions/filters',
  { event: 'onPress' },
);

export const PrimaryActionDispatchesItsPath = headerAction(newIssue, 'page', {
  event: 'onAction',
  payload: { path: ['primaryAction', 'onPress'], value: undefined },
});

export const PrimaryActionWaitsForItsHandler: Story = {
  play: async ({ canvas, userEvent }) => {
    const answer = Promise.withResolvers<void>();
    onEvent.mockReturnValueOnce(answer.promise);
    const action = canvas.getByRole('button', { name: newIssue });
    await userEvent.click(action);
    await expect(action).toHaveAttribute(disabledAttribute, 'true');
    answer.resolve();
    await waitFor(() =>
      expect(action).not.toHaveAttribute(disabledAttribute, 'true'),
    );
  },
};

export const CloseSearchSendsEmptyQuery: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: searchLabel }));
    await userEvent.type(
      canvas.getByRole('textbox', { name: searchLabel }),
      'regression',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Close search' }));
    await waitFor(() =>
      expect(onEvent).toHaveBeenLastCalledWith('page', {
        event: 'onChangeText',
        payload: '',
      }),
    );
  },
};
