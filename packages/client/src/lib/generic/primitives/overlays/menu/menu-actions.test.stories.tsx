import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { contentActionClass } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import { Pressable } from '#primitives/pressable';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Menu } from './menu';

const mergeActions = [
  { value: 'squash', label: 'Squash and merge' },
  { value: 'merge', label: 'Create a merge commit' },
  { value: 'rebase', label: 'Rebase and merge' },
] as const;

const onMergeAction = fn();

function MergeActions(): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel="Merge options"
      trigger="+2 more"
      actions={mergeActions.map(({ value, label }) => ({
        label,
        onPress: () => onMergeAction(value),
      }))}
    />
  );
}

const meta = {
  title: 'Tests/Menu/Actions',
  component: MergeActions,
} satisfies Meta<typeof MergeActions>;

export default meta;

type Story = StoryObj<typeof meta>;

function actionSelection(width: number): Story {
  return {
    play: async ({ canvas, canvasElement, userEvent }) => {
      onMergeAction.mockClear();
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      const trigger = canvas.getByRole('button', { name: 'Merge options' });
      await expect(trigger).toHaveTextContent('+2 more');
      await userEvent.click(trigger);
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(
        await page.findByRole('menuitem', { name: 'Rebase and merge' }),
      );
      await expect(onMergeAction).toHaveBeenCalledTimes(1);
      await expect(onMergeAction).toHaveBeenCalledWith('rebase');
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(trigger).toHaveFocus());
      // A pointer pick gives focus back without the keyboard's focus ring.
      await expect(trigger.matches(':focus-visible')).toBe(false);
      await userEvent.keyboard('{ArrowDown}');

      const first = await page.findByRole('menuitem', {
        name: 'Squash and merge',
      });

      await waitFor(() => expect(first).toHaveFocus());
      await expect(page.queryByRole('menuitemradio')).not.toBeInTheDocument();
      await userEvent.keyboard('{Enter}');
      await expect(onMergeAction).toHaveBeenCalledTimes(2);
      await expect(onMergeAction).toHaveBeenLastCalledWith('squash');
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
      await userEvent.keyboard('{Enter}');
      await page.findByRole('menu');
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(trigger).toHaveFocus());
      await expect(onMergeAction).toHaveBeenCalledTimes(2);
    },
  };
}

export const ActionSelectionWide = actionSelection(layoutWidths.wide);

export const ActionSelectionPhone = actionSelection(layoutWidths.phone);

const branches = Array.from(
  { length: 60 },
  (_, index) => `feature/branch-${String(index + 1).padStart(2, '0')}`,
);

const lastBranch = 'feature/branch-60';

function LongMenu(): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel="Branches"
      align="start"
      trigger={
        <Pressable role="button" className={contentActionClass({})}>
          <Text>Branches</Text>
        </Pressable>
      }
      actions={branches.map((branch) => ({ label: branch, onPress: noop }))}
    />
  );
}

function noop(): void {}

function insideViewport(element: Element): boolean {
  const { top, bottom } = element.getBoundingClientRect();

  return top >= 0 && bottom <= window.innerHeight;
}

function longMenuScrolls(width: number): Story {
  return {
    render: () => <LongMenu />,
    play: async ({ canvas, canvasElement, userEvent }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      await userEvent.click(canvas.getByRole('button', { name: 'Branches' }));
      const menu = await page.findByRole('menu');
      const last = page.getByRole('menuitem', { name: lastBranch });

      await waitFor(() => expect(insideViewport(menu)).toBe(true));
      await expect(insideViewport(last)).toBe(false);
      await browserUser.wheel(menu, { direction: 'down', times: 40 });
      await waitFor(() => expect(insideViewport(last)).toBe(true));
      await userEvent.click(last);
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
    },
  };
}

export const LongMenuScrollsWide = longMenuScrolls(layoutWidths.wide);

export const LongMenuScrollsPhone = longMenuScrolls(layoutWidths.phone);
