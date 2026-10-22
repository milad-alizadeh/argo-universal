import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { userEvent as browserUser } from 'vitest/browser';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Menu } from './menu';

const actions = [
  { value: 'one', label: 'Action one' },
  { value: 'two', label: 'Action two' },
  { value: 'three', label: 'Action three' },
] as const;

const onAction = fn();

function OptionsMenu(): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel="Options"
      trigger="Options"
      actions={actions.map(({ value, label }) => ({
        label,
        onPress: () => onAction(value),
      }))}
    />
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Menu/Actions',
  component: OptionsMenu,
} satisfies Meta<typeof OptionsMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

function actionSelection(width: number): Story {
  return {
    play: async ({ canvas, canvasElement, userEvent }) => {
      onAction.mockClear();
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      const trigger = canvas.getByRole('button', { name: 'Options' });
      await expect(trigger).toHaveTextContent('Options');
      await userEvent.click(trigger);
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await userEvent.click(
        await page.findByRole('menuitem', { name: 'Action three' }),
      );
      await expect(onAction).toHaveBeenCalledTimes(1);
      await expect(onAction).toHaveBeenCalledWith('three');
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
      await waitFor(() => expect(trigger).toHaveFocus());
      // A pointer pick gives focus back without the keyboard's focus ring.
      await expect(trigger.matches(':focus-visible')).toBe(false);
      await userEvent.keyboard('{ArrowDown}');

      const first = await page.findByRole('menuitem', {
        name: 'Action one',
      });

      await waitFor(() => expect(first).toHaveFocus());
      await expect(page.queryByRole('menuitemradio')).not.toBeInTheDocument();
      await userEvent.keyboard('{Enter}');
      await expect(onAction).toHaveBeenCalledTimes(2);
      await expect(onAction).toHaveBeenLastCalledWith('one');
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
      await expect(onAction).toHaveBeenCalledTimes(2);
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
