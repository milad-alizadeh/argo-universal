import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Page, PageHeaderActions } from './index';

const meta = {
  title: 'Tests/PageHeaderActions',
  component: Page,
} satisfies Meta<typeof Page>;

export default meta;

type Story = StoryObj<typeof meta>;

const chosen = fn();

// Content parts hand their Actions up beside the Page's own; none replaces another's.
export const ContentActionsJoinTheHeader: Story = {
  args: {
    title: 'Issue',
    actions: (
      <ActionList>
        <Action label="Share" icon="filters" onPress={() => chosen('share')} />
      </ActionList>
    ),
    children: (
      <>
        <PageHeaderActions>
          <ActionList>
            <Action label="Edit" icon="rename" onPress={() => chosen('edit')} />
          </ActionList>
        </PageHeaderActions>
        <PageHeaderActions>
          <ActionList>
            <Action label="Pin" icon="archive" onPress={() => chosen('pin')} />
          </ActionList>
        </PageHeaderActions>
      </>
    ),
  },
  play: async ({ canvas, canvasElement, userEvent }) => {
    chosen.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Share' }));
    await userEvent.click(canvas.getByRole('button', { name: 'More actions' }));

    const menu = within(
      await within(canvasElement.ownerDocument.body).findByRole('menu'),
    );

    await userEvent.click(menu.getByRole('menuitem', { name: 'Pin' }));
    await expect(chosen.mock.calls).toEqual([['share'], ['pin']]);
    await expect(canvas.getByRole('button', { name: 'Edit' })).toBeVisible();
  },
};
