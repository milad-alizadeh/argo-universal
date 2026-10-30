import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths, settleLayout } from '#mocks/story-layout';
import {
  lastActionLabel,
  narrowColumnLabel,
  SidebarSearchExample,
  sidebarSearchLabel,
} from './search-field-sidebar.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Controls/SearchField/Sidebar',
  component: SidebarSearchExample,
} satisfies Meta<typeof SidebarSearchExample>;

export default meta;

type Story = StoryObj<typeof meta>;

function boxOf(element: Element | null): DOMRect {
  if (!element) throw new Error('The search field is missing an element.');

  return element.getBoundingClientRect();
}

function centreOf(element: Element | null): number {
  const box = boxOf(element);

  return box.left + box.width / 2;
}

// The lens is drawn over the search button rather than inside it, so it is no control of its own to find by role.
const lens = (): Element | null =>
  document.querySelector('[data-testid=search-lens]');

const apart = (left: DOMRect, right: DOMRect): boolean =>
  left.right <= right.left || right.right <= left.left;

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

/*
 * The row's new width reaches the field through a layout observer a frame or two after the column moves, and the
 * button's own measurement does not follow it, so the lens is watched over the frames that follow rather than once.
 */
const settlingFrames = 30;

async function staysOnTheButton(trigger: Element): Promise<void> {
  for (let frame = 0; frame < settlingFrames; frame += 1) {
    await nextFrame();
    await expect(centreOf(lens())).toBeCloseTo(centreOf(trigger), 0);
  }
}

/*
 * A column that narrows after its heading has been laid out moves the search button without resizing it. The lens
 * keeps the button's place through the move, and so stays clear of the actions drawn after it.
 */
export const LensStaysOnTheButtonAsTheColumnNarrows: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout(layoutWidths.wide);
    const trigger = canvas.getByRole('button', { name: sidebarSearchLabel });
    const add = canvas.getByRole('button', { name: lastActionLabel });
    await waitFor(() =>
      expect(centreOf(lens())).toBeCloseTo(centreOf(trigger), 0),
    );
    const opened = boxOf(trigger).left;

    await userEvent.click(
      canvas.getByRole('button', { name: narrowColumnLabel }),
    );
    await waitFor(() => expect(boxOf(trigger).left).toBeLessThan(opened));
    await staysOnTheButton(trigger);
    await expect(apart(boxOf(lens()), boxOf(add))).toBe(true);
  },
};
