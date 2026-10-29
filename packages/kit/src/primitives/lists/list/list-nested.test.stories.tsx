import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn } from 'storybook/test';
import { pressTarget } from '#mocks/press-target';
import { settleLayout } from '#mocks/story-layout';
import { ListItem } from '#primitives/lists/list-item';
import { List } from './list';
import { nestedList, nestedRegularList } from './list-nested-fixtures';

const meta = {
  title: 'Tests/Design System/Primitives/Lists/List/Nested',
  component: List,
  parameters: { screenPreview: true },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

// The fixture's row titles.
const [parent, child, grandchild, withoutChildren, onlyChild] = [
  'Parent item',
  'Child item',
  'Grandchild item',
  'Item without children',
  'Its only child',
];

const children = [child, 'Selected child item', 'Last child item'];

// The parent's own chevron, which carries its open state; the row itself never does.
const chevron = (open: boolean, name = parent) =>
  ({ name, expanded: open }) as const;

async function expectShown(canvas: Canvas, titles: string[]): Promise<void> {
  for (const title of titles)
    await expect(await canvas.findByText(title)).toBeVisible();
}

async function expectGone(canvas: Canvas, titles: string[]): Promise<void> {
  for (const title of titles)
    await expect(canvas.queryByText(title)).toBeNull();
}

export const FoldsWide: Story = {
  args: nestedList,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await expectShown(canvas, [...children, grandchild]);

    await userEvent.click(canvas.getByRole('button', chevron(true)));

    await expectGone(canvas, [...children, grandchild]);
    await expect(canvas.getByRole('button', chevron(false))).toBeVisible();
    await expectShown(canvas, [withoutChildren, onlyChild]);

    await userEvent.click(canvas.getByRole('button', chevron(false)));

    await expectShown(canvas, children);
  },
};

// A child that holds children folds them alone; its parent stays open.
export const FoldsOneLevel: Story = {
  args: nestedList,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(
      await canvas.findByRole('button', chevron(true, 'Selected child item')),
    );

    await expectGone(canvas, [grandchild]);
    await expectShown(canvas, ['Last child item']);
    await expect(canvas.getByRole('button', chevron(true))).toBeVisible();
  },
};

export const FoldsFromTheKeyboard: Story = {
  args: nestedList,
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');

    const toggle = await canvas.findByRole('button', chevron(true));

    toggle.focus();
    await userEvent.keyboard('{Enter}');

    await expectGone(canvas, [child]);
    await expect(canvas.getByRole('button', chevron(false))).toHaveFocus();

    await userEvent.keyboard(' ');

    await expectShown(canvas, [child]);
  },
};

const pressParent = fn();

const pressChild = fn();

// A parent and its child, each with a press of its own.
const pressedRows = (): React.JSX.Element => (
  <List appearance="plain" density="compact">
    <ListItem key="parent" title={parent} onPress={pressParent}>
      <ListItem key="child" title={child} onPress={pressChild} />
    </ListItem>
  </List>
);

interface Point {
  x: number;
  y: number;
}

// The middle of an element, where a tap lands.
const middle = (element: Element): Point => {
  const box = element.getBoundingClientRect();

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

// What a tap reaches at a point.
function tapAt(x: number, y: number): Element {
  const target = document.elementFromPoint(x, y);

  if (!target) throw new Error('Nothing at the point to press');

  return target;
}

// Pressing a parent's row presses the row; only its chevron folds it.
export const RowPressKeepsChildren: Story = {
  render: () => pressedRows(),
  play: async ({ canvas, userEvent }) => {
    pressParent.mockClear();
    await settleLayout('wide');
    await userEvent.click(pressTarget(await canvas.findByText(parent)));

    await expect(pressParent).toHaveBeenCalledOnce();
    await expectShown(canvas, [child]);
    await expect(canvas.getByRole('button', chevron(true))).toBeVisible();
  },
};

// A child's rail, under its parent's chevron, presses the child's row rather than taking the press.
export const RailPressesItsRow: Story = {
  render: () => pressedRows(),
  play: async ({ canvas, userEvent }) => {
    pressChild.mockClear();
    await settleLayout('wide');

    const lane = middle(await canvas.findByRole('button', chevron(true)));
    const row = middle(await canvas.findByText(child));

    await userEvent.click(tapAt(lane.x, row.y));

    await expect(pressChild).toHaveBeenCalledOnce();
    await expectShown(canvas, [child]);
  },
};

// A parent's chevron sits beside its row's press, never inside it, so the web nests no button in another.
const chevronBeside = (args: Story['args']): Story => ({
  args,
  play: async ({ canvas }) => {
    await settleLayout('wide');

    const toggle = await canvas.findByRole('button', chevron(true));

    await expect(
      toggle.parentElement?.closest('button, [role="button"]'),
    ).toBeNull();
  },
});

export const ChevronIsNotInsideTheRowsButton = chevronBeside(nestedList);

export const ChevronIsNotInsideARegularRowsButton =
  chevronBeside(nestedRegularList);

// A phone width draws every child flat after its parent, with nothing to fold.
export const FlatOnPhone: Story = {
  args: nestedList,
  play: async ({ canvas }) => {
    await settleLayout('phone');
    await expectShown(canvas, [...children, grandchild, onlyChild]);

    await expect(
      canvas.queryAllByRole('button', { expanded: true }),
    ).toHaveLength(0);
    await expect(
      canvas.queryAllByRole('button', { expanded: false }),
    ).toHaveLength(0);
  },
};

// Rows inside a Section nest and fold as loose rows do.
export const FoldsInASection: Story = {
  render: () => (
    <List appearance="grouped">
      <List.Section title="Section">
        <ListItem key="parent" title={parent}>
          <ListItem key="child" title={child} />
        </ListItem>
      </List.Section>
    </List>
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await expectShown(canvas, [child]);
    await userEvent.click(canvas.getByRole('button', chevron(true)));
    await expectGone(canvas, [child]);
  },
};

const rows = [
  { id: 'one', title: parent, children: [child] },
  { id: 'two', title: withoutChildren, children: [] },
];

// A data List's rendered row draws its own children after it and folds them itself.
export const FoldsARenderedRow: Story = {
  render: () => (
    <List
      appearance="plain"
      items={rows}
      keyExtractor={(row) => row.id}
      renderItem={(row) => (
        <ListItem title={row.title}>
          {row.children.map((title) => (
            <ListItem key={title} title={title} />
          ))}
        </ListItem>
      )}
    />
  ),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await expectShown(canvas, [child]);
    await userEvent.click(canvas.getByRole('button', chevron(true)));
    await expectGone(canvas, [child]);
    await expectShown(canvas, [withoutChildren]);
  },
};
