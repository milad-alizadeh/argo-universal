import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { Button } from '#primitives/actions/button';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Action, ActionList } from './index';

const choose = fn();

const meta = {
  title: 'Tests/Design System/Primitives/Actions/ActionList',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function header(width: number): Story {
  return {
    render: () => (
      <ActionList accessibilityLabel="Project actions">
        <ActionList.Section title="Project">
          {/* With no icon to draw as a header button, it waits in the menu. */}
          <Action label="Rename" onPress={() => choose('rename')} />
          <Action
            label="Add Project"
            icon="add"
            onPress={() => choose('add')}
          />
          <Action
            label="Create branch"
            icon="branch"
            onPress={() => choose('branch')}
            disabled
          />
          <Action
            label="Show archived"
            icon="archive"
            onPress={() => choose('show')}
          />
        </ActionList.Section>
        <ActionList.Section>
          <Action
            label="Delete"
            icon="delete"
            tone="danger"
            onPress={() => choose('delete')}
          />
        </ActionList.Section>
      </ActionList>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
      choose.mockClear();
      await settleViewport(width);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Add Project' }),
      );
      await expect(choose).toHaveBeenLastCalledWith('add');
      await expect(
        canvas.getByRole('button', { name: 'Create branch' }),
      ).toBeDisabled();
      await expect(canvas.queryByRole('button', { name: 'Rename' })).toBeNull();
      await userEvent.click(
        canvas.getByRole('button', { name: 'Project actions' }),
      );
      const page = within(canvasElement.ownerDocument.body);
      const menu = within(await page.findByRole('menu'));
      await waitFor(() => expect(menu.getByText('Project')).toBeVisible());
      await expect(
        menu
          .getAllByRole('menuitem')
          .map((item) => item.getAttribute('aria-label')),
      ).toEqual(['Rename', 'Show archived', 'Delete']);
      await userEvent.click(menu.getByRole('menuitem', { name: 'Delete' }));
      await expect(choose).toHaveBeenLastCalledWith('delete');
      await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
    },
  };
}

export const HeaderWide = header(layoutWidths.wide);

export const HeaderPhone = header(layoutWidths.phone);

function context(width: number): Story {
  return {
    render: () => (
      <ActionList variant="context" trigger={<Button label="Deploy web" />}>
        <Action
          label="Delete"
          icon="delete"
          tone="danger"
          onPress={() => choose('delete')}
        />
        <ActionList.Section title="Run">
          <Action
            label="Open"
            icon="external-link"
            onPress={() => choose('open')}
          />
          <Action
            label="Archive"
            icon="archive"
            disabled
            onPress={() => choose('archive')}
          />
        </ActionList.Section>
      </ActionList>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
      choose.mockClear();
      await settleViewport(width);
      const trigger = canvas.getByRole('button', { name: 'Deploy web' });
      await userEvent.pointer({ keys: '[MouseRight]', target: trigger });
      const page = within(canvasElement.ownerDocument.body);
      const menu = within(await page.findByRole('menu'));
      await expect(
        menu
          .getAllByRole('menuitem')
          .map((item) => item.getAttribute('aria-label')),
      ).toEqual(['Open', 'Archive', 'Delete']);
      await expect(
        menu.getByRole('menuitem', { name: 'Archive' }),
      ).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(menu.getByRole('menuitem', { name: 'Open' }));
      await expect(choose).toHaveBeenCalledTimes(1);
      await expect(choose).toHaveBeenLastCalledWith('open');
      await userEvent.pointer({ keys: '[MouseRight]', target: trigger });
      await page.findByRole('menu');
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
      await expect(choose).toHaveBeenCalledTimes(1);
    },
  };
}

export const ContextWide = context(layoutWidths.wide);

export const ContextPhone = context(layoutWidths.phone);

export const Empty: Story = {
  render: () => <ActionList />,
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};
