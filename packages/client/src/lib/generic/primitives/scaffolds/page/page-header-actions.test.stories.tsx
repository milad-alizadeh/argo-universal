import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Page, PageHeaderActions } from './index';
import { exampleSubmenu } from './page-submenu-example.mocks';
import { atWidth, pageWidths } from './page-widths.mocks';

const meta = {
  title: 'Tests/Page/Header actions',
  component: Page,
  args: { title: 'Projects' },
} satisfies Meta<typeof Page>;

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

export const HeaderSubmenuPhone = atWidth(pageWidths.Phone, headerSubmenu);

export const HeaderSubmenuWide = atWidth(pageWidths.Wide, headerSubmenu);

const chosen = fn();

const overflowButton = { name: 'More actions' };

const choose = (label: string) => (): void => chosen(label);

// A full header folds a submenu into the overflow menu, where it opens as a nested menu whose Actions still run.
const nestedSubmenu: Story = {
  args: {
    actions: (
      <ActionList>
        <Action label="Copy link" icon="copy" onPress={choose('Copy link')} />
        <Action label="Rename" icon="rename" onPress={choose('Rename')} />
        {exampleSubmenu(chosen)}
        <Action label="Archive" icon="archive" onPress={choose('Archive')} />
      </ActionList>
    ),
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    chosen.mockClear();
    const page = within(canvasElement.ownerDocument.body);
    await expect(canvas.queryByRole('button', { name: 'Sort, 2' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', overflowButton));
    await userEvent.click(await page.findByRole('menuitem', { name: 'Sort' }));
    // The nested row is chosen from the keyboard: a test pointer leaving the Sort row has no path into the nested menu.
    (await page.findByRole('menuitem', { name: 'Oldest' })).focus();
    await userEvent.keyboard('{Enter}');
    await expect(chosen).toHaveBeenLastCalledWith('Oldest');
  },
};

export const NestedSubmenuPhone = atWidth(pageWidths.Phone, nestedSubmenu);

export const NestedSubmenuWide = atWidth(pageWidths.Wide, nestedSubmenu);

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

export const TwoListsPhone = atWidth(pageWidths.Phone, twoLists);

export const TwoListsWide = atWidth(pageWidths.Wide, twoLists);

const renamed = fn();

// The heading draws a list's Actions for it, and the list's shortcuts still run.
export const HeaderShortcut = atWidth(pageWidths.Wide, {
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

const joined = fn();

// Content parts hand their Actions up beside the Page's own; none replaces another's.
export const ContentActionsJoinTheHeader: Story = {
  args: {
    title: 'Issue',
    actions: (
      <ActionList>
        <Action label="Share" icon="filters" onPress={() => joined('share')} />
      </ActionList>
    ),
    children: (
      <>
        <PageHeaderActions>
          <ActionList>
            <Action label="Edit" icon="rename" onPress={() => joined('edit')} />
          </ActionList>
        </PageHeaderActions>
        <PageHeaderActions>
          <ActionList>
            <Action label="Pin" icon="archive" onPress={() => joined('pin')} />
          </ActionList>
        </PageHeaderActions>
      </>
    ),
  },
  play: async ({ canvas, userEvent }) => {
    joined.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Share' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Pin' }));
    await expect(joined.mock.calls).toEqual([['share'], ['pin']]);
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
  },
};
