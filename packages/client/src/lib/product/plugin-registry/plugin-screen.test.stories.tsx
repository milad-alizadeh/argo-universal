import type { MadePageCall } from '@repo/contracts/plugins/page-call-payload';
import { WireNode } from '@repo/contracts/plugins/wire';
import fixture from '@repo/mocks/plugins/screen.json' with { type: 'json' };
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { PluginTree, type PageEvent } from './plugin-registry';

const root = WireNode.parse(fixture);

const onPageCall = fn(async () => {});

const from = (key: string): PageEvent => expect.objectContaining({ key });

const searchLabel = 'Search Issues';

const newIssue = 'New Issue';

const disabledAttribute = 'aria-disabled';

const meta = {
  title: 'Tests/Design System/Patterns/PluginRegistry/Screen',
  render: (): React.JSX.Element => (
    <PluginTree root={root} onPageCall={onPageCall} />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DrawsTitleAndContent: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Issues' })).toBeVisible();
    await expect(canvas.getByText('Open Issues')).toBeVisible();
  },
};

// Every header Action, the primary one included, makes its call from its own keyed node.
function headerAction(name: string, key: string, call: MadePageCall): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      onPageCall.mockClear();
      await userEvent.click(canvas.getByRole('button', { name }));
      await expect(onPageCall).toHaveBeenLastCalledWith(call, from(key));
    },
  };
}

export const FiltersActionMakesItsCall = headerAction(
  'Filters',
  'page#actions/filters',
  { operation: 'openFilters', args: {} },
);

export const PrimaryActionMakesItsCall = headerAction(
  newIssue,
  'page#primaryAction/new',
  { operation: 'newIssue', args: {} },
);

// An Action inside a submenu is a keyed child of the submenu's own node.
export const SubmenuActionMakesItsCall: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    onPageCall.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Sort, 2' }));
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Oldest' }),
    );
    await expect(onPageCall).toHaveBeenLastCalledWith(
      { pageState: { order: 'oldest' } },
      from('page#actions/sort/order/oldest'),
    );
  },
};

export const PrimaryActionWaitsForItsHandler: Story = {
  play: async ({ canvas, userEvent }) => {
    const answer = Promise.withResolvers<void>();
    onPageCall.mockReturnValueOnce(answer.promise);
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
      expect(onPageCall).toHaveBeenLastCalledWith(
        { bind: 'query' },
        expect.objectContaining({ key: 'page', payload: '' }),
      ),
    );
  },
};
