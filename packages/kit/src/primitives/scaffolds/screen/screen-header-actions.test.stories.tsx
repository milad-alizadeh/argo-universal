import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Screen } from './index';
import {
  exampleSubmenu,
  type SubmenuBadge,
} from './screen-submenu-example.mocks';
import { atWidth, screenWidths } from './screen-widths.mocks';

const meta = {
  title: 'Tests/Design System/Primitives/Scaffolds/Screen/HeaderActions',
  component: Screen,
  args: { title: 'Projects' },
} satisfies Meta<typeof Screen>;

export default meta;

type Story = StoryObj<typeof meta>;

const sorted = fn();

// A submenu keeps its own header button, its badge in the spoken name, and runs the Action chosen inside it.
const headerSubmenu: Story = {
  args: {
    actions: <ActionList>{exampleSubmenu(sorted)}</ActionList>,
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    sorted.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Sort, 2' }));
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Oldest' }),
    );
    await expect(sorted).toHaveBeenLastCalledWith('Oldest');
  },
};

export const HeaderSubmenuPhone = atWidth(screenWidths.Phone, headerSubmenu);

export const HeaderSubmenuWide = atWidth(screenWidths.Wide, headerSubmenu);

const chosen = fn();

const overflowButton = { name: 'More actions' };

const choose = (label: string) => (): void => chosen(label);

// The overflow menu of a full header, holding the Sort submenu with the given badge.
const fullHeader = (badge?: SubmenuBadge): ReactElement => (
  <ActionList>
    <Action label="Copy link" icon="copy" onPress={choose('Copy link')} />
    <Action label="Rename" icon="rename" onPress={choose('Rename')} />
    {exampleSubmenu(chosen, badge)}
    <Action label="Archive" icon="archive" onPress={choose('Archive')} />
  </ActionList>
);

// A full header folds a submenu into the overflow menu, where it opens as a nested menu whose Actions still run.
const nestedSubmenu: Story = {
  args: { actions: fullHeader() },
  play: async ({ canvas, canvasElement, userEvent }) => {
    chosen.mockClear();
    const page = within(canvasElement.ownerDocument.body);
    await expect(canvas.queryByRole('button', { name: 'Sort, 2' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', overflowButton));
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Sort, 2' }),
    );
    // The nested row is chosen from the keyboard: a test pointer leaving the Sort row has no path into the nested menu.
    (await page.findByRole('menuitem', { name: 'Oldest' })).focus();
    await userEvent.keyboard('{Enter}');
    await expect(chosen).toHaveBeenLastCalledWith('Oldest');
  },
};

export const NestedSubmenuPhone = atWidth(screenWidths.Phone, nestedSubmenu);

export const NestedSubmenuWide = atWidth(screenWidths.Wide, nestedSubmenu);

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

// Opens the overflow menu and finds the folded submenu's row by its spoken name.
async function foldedRow(
  { canvas, canvasElement, userEvent }: PlayContext,
  name: string,
): Promise<HTMLElement> {
  await userEvent.click(canvas.getByRole('button', overflowButton));
  const page = within(canvasElement.ownerDocument.body);

  return page.findByRole('menuitem', { name });
}

// A submenu folded into the overflow menu keeps its count badge's count after its label.
export const FoldedSubmenuCount = atWidth(screenWidths.Wide, {
  args: { actions: fullHeader() },
  play: async (context) => {
    const row = await foldedRow(context, 'Sort, 2');
    // The menu fades in, so the count is visible once the opening animation ends.
    await waitFor(() => expect(within(row).getByText('2')).toBeVisible());
  },
});

// A status dot has no count, so the folded row shows its label alone.
export const FoldedSubmenuDot = atWidth(screenWidths.Wide, {
  args: { actions: fullHeader({ kind: 'status', tone: 'warning' }) },
  play: async (context) => {
    const row = await foldedRow(context, 'Sort');
    await expect(row).toHaveTextContent('Sort');
    await expect(row).not.toHaveTextContent(/\d/);
  },
});

// Two ActionLists share one header: three controls at most, one overflow menu, and each list's Actions still run.
const twoLists: Story = {
  args: {
    actions: (
      <>
        <ActionList>
          <Action label="Filters" icon="filters" onPress={choose('Filters')} />
        </ActionList>
        <ActionList>
          <Action label="Copy link" icon="copy" onPress={choose('Copy link')} />
          <Action label="Rename" icon="rename" onPress={choose('Rename')} />
          <Action label="Archive" icon="archive" onPress={choose('Archive')} />
        </ActionList>
      </>
    ),
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    chosen.mockClear();
    const page = within(canvasElement.ownerDocument.body);
    await expect(canvas.getAllByRole('button').length).toBeLessThanOrEqual(3);
    await expect(canvas.getAllByRole('button', overflowButton)).toHaveLength(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }));
    await userEvent.click(canvas.getByRole('button', overflowButton));
    await userEvent.click(
      await page.findByRole('menuitem', { name: 'Archive' }),
    );
    await expect(chosen.mock.calls).toEqual([['Filters'], ['Archive']]);
  },
};

export const TwoListsPhone = atWidth(screenWidths.Phone, twoLists);

export const TwoListsWide = atWidth(screenWidths.Wide, twoLists);

const renamed = fn();

// The heading draws a list's Actions for it, and the list's shortcuts still run.
export const HeaderShortcut = atWidth(screenWidths.Wide, {
  args: {
    actions: (
      <ActionList>
        <Action
          label="Rename"
          icon="rename"
          shortcut={{ modifiers: ['alt'], key: 'i' }}
          onPress={renamed}
        />
      </ActionList>
    ),
  },
  play: async ({ canvas, userEvent }) => {
    renamed.mockClear();
    await expect(canvas.getByRole('button', { name: 'Rename' })).toBeVisible();
    await userEvent.keyboard('{Alt>}i{/Alt}');
    await expect(renamed).toHaveBeenCalledOnce();
  },
});
