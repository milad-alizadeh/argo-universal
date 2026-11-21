import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { createElement, type ElementType } from 'react';
import { expect } from 'storybook/test';
import { Action } from './primitives/actions/action';
import { actionGroups } from './primitives/actions/action/action-declarations';
import {
  BoardCardPart,
  BoardColumnPart,
  boardColumns,
} from './primitives/lists/board/board-columns';
import { ListSection } from './primitives/lists/list/index';
import { isSection } from './primitives/lists/list/list-level-entries';
import {
  TableCellPart,
  TableRowPart,
  tableRows,
} from './primitives/lists/table/table-rows';
import {
  SheetScreen,
  sheetScreens,
} from './primitives/overlays/sheet/sheet-screens';
import { canvasChildren } from './primitives/visual/canvas/canvas-children';
import {
  CanvasCircle,
  CanvasGroup,
  CanvasLine,
  CanvasPath,
  CanvasRect,
  CanvasText,
} from './primitives/visual/canvas/canvas-shapes';
import { wrappingComponent } from './wrapped-component';

const meta = {
  title: 'Tests/WrappedChildren',
  // The checks read children as data; there is nothing to draw.
  render: () => <></>,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type Draw = (component: ElementType) => ElementType;

// What the App's comment mode draws a node as: another component that stands in for the kit's.
const wrapped: Draw = (component) =>
  typeof component === 'string'
    ? component
    : wrappingComponent(() => null, component);

const plain: Draw = (component) => component;

const press = { title: 'Go', onPress: () => undefined };

// A parent that reads its children by type reads wrapped children as it reads plain ones.
async function recognises(read: (draw: Draw) => unknown): Promise<void> {
  const expected = JSON.stringify(read(plain));

  await expect(expected).not.toBe('[]');
  await expect(JSON.stringify(read(wrapped))).toBe(expected);
}

export const TableReadsWrappedRowsAndCells: Story = {
  play: () =>
    recognises((draw) =>
      tableRows(
        createElement(
          draw(TableRowPart),
          { key: 'a', id: 'a' },
          createElement(draw(TableCellPart), { key: 'name', text: 'Ada' }),
        ),
        [{ id: 'name', title: 'Name' }],
      ).map(({ cells, ...row }) => ({ ...row, cells: [...cells] })),
    ),
};

export const BoardReadsWrappedColumnsAndCards: Story = {
  play: () =>
    recognises((draw) =>
      boardColumns(
        createElement(
          draw(BoardColumnPart),
          { key: 'todo', id: 'todo', title: 'To do' },
          createElement(draw(BoardCardPart), { key: 'c', id: 'c', title: 'C' }),
        ),
      ),
    ),
};

const shapes: [ElementType, object][] = [
  [CanvasRect, { x: 0, y: 0, width: 1, height: 1 }],
  [CanvasCircle, { cx: 1, cy: 1, r: 1 }],
  [CanvasLine, { x1: 0, y1: 0, x2: 1, y2: 1 }],
  [CanvasPath, { d: 'M0 0' }],
  [CanvasText, { x: 0, y: 0, children: 'a' }],
  [CanvasGroup, {}],
];

export const CanvasReadsEveryWrappedShape: Story = {
  play: () =>
    recognises((draw) =>
      canvasChildren(
        shapes.map(([shape, props], index) =>
          createElement(draw(shape), { ...props, key: index }),
        ),
      ),
    ),
};

export const ActionsReadAWrappedAction: Story = {
  play: () =>
    recognises((draw) =>
      actionGroups(createElement(draw(Action), { key: 'go', ...press })),
    ),
};

export const ActionsReadAWrappedSection: Story = {
  play: () =>
    recognises((draw) =>
      actionGroups(
        createElement(
          Action,
          { key: 'menu', title: 'More' },
          createElement(
            draw(Action.Section),
            { key: 's', title: 'Group' },
            createElement(Action, { key: 'go', ...press }),
          ),
        ),
      ),
    ),
};

export const SheetReadsAWrappedScreen: Story = {
  play: () =>
    recognises((draw) =>
      sheetScreens(
        createElement(draw(SheetScreen), { name: 'root' }, 'content'),
      ),
    ),
};

export const ListReadsAWrappedSection: Story = {
  play: () =>
    recognises((draw) => [
      isSection(createElement(draw(ListSection), { title: 'Open' })),
    ]),
};
