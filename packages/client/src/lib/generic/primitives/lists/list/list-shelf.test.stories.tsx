import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  expect,
  fn,
  waitFor,
  within,
  userEvent as browserUserEvent,
} from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { ActionList, Action } from '#primitives/actions/action-list';
import { Text } from '#primitives/content/text';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';

const meta = {
  title: 'Tests/List shelves',
  parameters: { screenPreview: true },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const headingRole = 'heading';

const inspect = fn();

const tileActions = (
  <ActionList>
    <Action icon="info" label="Inspect" onPress={inspect} />
  </ActionList>
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

export const ShelfEndControls: Story = {
  render: () => <ShelfControlsExample />,
  play: async ({ canvas, userEvent }) => {
    const previous = await canvas.findByRole('button', {
      name: 'Previous items',
    });

    const next = canvas.getByRole('button', { name: 'Next items' });
    await expect(previous).toBeDisabled();
    await waitFor(() => expect(next).toBeEnabled());
    await userEvent.click(next);
    await waitFor(() => expect(next).toBeDisabled());
    await expect(previous).toBeEnabled();
    await userEvent.click(previous);
    await waitFor(() => expect(previous).toBeDisabled());
  },
};

export const CompactShelf: Story = {
  render: () => <ShelfControlsExample />,
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.phone);
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
