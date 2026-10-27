import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  expect,
  fn,
  waitFor,
  within,
  userEvent as browserUserEvent,
} from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { Action } from '#primitives/actions/action';
import { Text } from '#primitives/content/text';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Shelf',
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide');
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const headingRole = 'heading';

const inspect = fn();

const tileActions = (
  <Action key="inspect" icon="info" label="Inspect" onPress={inspect} />
);

export const ContextActions: Story = {
  render: () => (
    <List layout="grid">
      <ListItem
        title="Preview actions"
        media={<Text>Thumbnail</Text>}
        actions={tileActions}
      />
    </List>
  ),
  play: async ({ canvas, canvasElement }) => {
    await browserUserEvent.pointer({
      target: await canvas.findByText('Preview actions'),
      keys: '[MouseRight]',
    });
    await browserUserEvent.click(
      await within(canvasElement.ownerDocument.body).findByRole('menuitem', {
        name: 'Inspect',
      }),
    );
    await expect(inspect).toHaveBeenCalledOnce();
  },
};

const shelfItems = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
];

const shelfOptions = {
  testID: 'shelf-scroll',
  direction: 'horizontal',
  tileSize: 'sm',
  items: shelfItems,
  header: <Text role={headingRole}>Files</Text>,
} as const;

function ShelfControlsExample(): React.JSX.Element {
  return (
    <List
      {...shelfOptions}
      renderItem={(title: string) => (
        <ListItem title={title} media={<Text>Thumbnail</Text>} />
      )}
    />
  );
}

const edgeWait = { timeout: 5000 };

// A press that lands while the list is still re-measuring can scroll nowhere, so the press is repeated until the edge shows.
async function pressUntil(
  userEvent: Pick<typeof browserUserEvent, 'click'>,
  button: HTMLElement,
  reachedEdge: () => Promise<void> | void,
): Promise<void> {
  await waitFor(async () => {
    if (button.getAttribute('disabled') === null) await userEvent.click(button);
    await reachedEdge();
  }, edgeWait);
}

export const ShelfEndControls: Story = {
  render: () => <ShelfControlsExample />,
  play: async ({ canvas, userEvent }) => {
    const previous = await canvas.findByRole('button', {
      name: 'Previous items',
    });

    const next = canvas.getByRole('button', { name: 'Next items' });
    // The edges follow the list's scroll measurements and the animated scroll, which a busy runner can take seconds over.
    await waitFor(() => expect(previous).toBeDisabled(), edgeWait);
    await waitFor(() => expect(next).toBeEnabled(), edgeWait);
    await pressUntil(userEvent, next, () => expect(next).toBeDisabled());
    await expect(previous).toBeEnabled();
    await pressUntil(userEvent, previous, () =>
      expect(previous).toBeDisabled(),
    );
  },
};

export const CompactShelf: Story = {
  render: () => <ShelfControlsExample />,
  beforeEach: async (): Promise<void> => {
    await settleLayout('phone');
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('One')).toBeVisible();
    await expect(
      canvas.queryByRole('button', { name: 'Next items' }),
    ).toBeNull();
    const scroll = canvas.getByTestId('shelf-scroll');
    scroll.scrollTo({ left: scroll.scrollWidth });
    await expect(await canvas.findByText('Eight')).toBeVisible();
  },
};
