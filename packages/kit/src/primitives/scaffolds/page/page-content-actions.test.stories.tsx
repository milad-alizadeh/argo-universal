import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { Action, ActionList } from '#primitives/actions/action-list';
import { Page, PageHeaderActions } from './index';

const meta = {
  title: 'Tests/Page/Content actions',
  component: Page,
  args: { title: 'Projects' },
} satisfies Meta<typeof Page>;

export default meta;

type Story = StoryObj<typeof meta>;

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
