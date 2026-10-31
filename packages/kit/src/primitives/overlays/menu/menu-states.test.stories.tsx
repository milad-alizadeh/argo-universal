import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn, waitFor, within } from 'storybook/test';
import { settleLayout } from '#mocks/story-layout';
import { contentActionClass, Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import { Menu } from './menu';
import { type MenuOption, menuLoadingLabel } from './menu-props';

interface StatesProps {
  kind: 'choice' | 'action';
  loading?: boolean;
  onChoose: (value: string) => void;
}

const answers: readonly MenuOption<string>[] = [
  { value: 'default', label: 'Default' },
  { value: 'full', label: 'Full access', disabled: true },
];

const trigger = (
  <Pressable role="button" className={contentActionClass({})}>
    <Text>Permissions</Text>
  </Pressable>
);

// One menu whose second answer is shown but not allowed, as a choice or an action menu.
function States({ kind, loading, onChoose }: StatesProps): React.JSX.Element {
  if (kind === 'choice')
    return (
      <Menu
        accessibilityLabel="Permissions"
        trigger={trigger}
        value="default"
        options={answers}
        loading={loading}
        onValueChange={onChoose}
      />
    );

  return (
    <Menu
      accessibilityLabel="Permissions"
      trigger={trigger}
      loading={loading}
      actions={answers.map((answer) => ({
        label: answer.label,
        disabled: answer.disabled,
        onPress: () => onChoose(answer.value),
      }))}
    />
  );
}

const meta = {
  title: 'Tests/Design System/Primitives/Overlays/Menu/States',
  component: States,
  args: { kind: 'choice', onChoose: fn() },
} satisfies Meta<typeof States>;

export default meta;

type Story = StoryObj<typeof meta>;

const itemRole = (kind: StatesProps['kind']): 'menuitemradio' | 'menuitem' =>
  kind === 'choice' ? 'menuitemradio' : 'menuitem';

// A disabled answer is listed and announced as disabled; the keyboard passes over it.
function disabledAnswer(kind: StatesProps['kind']): Story {
  return {
    args: { kind },
    play: async ({ canvas, canvasElement, userEvent, args }) => {
      await settleLayout('wide');
      const page = within(canvasElement.ownerDocument.body);
      canvas.getByRole('button', { name: 'Permissions' }).focus();
      await userEvent.keyboard('{Enter}');

      const full = await page.findByRole(itemRole(kind), {
        name: 'Full access',
      });

      const first = page.getByRole(itemRole(kind), { name: 'Default' });

      await expect(full).toHaveAttribute('aria-disabled', 'true');
      await waitFor(() => expect(first).toHaveFocus());
      await userEvent.keyboard('{ArrowDown}');
      await expect(full).not.toHaveFocus();
      await expect(first).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(args.onChoose).toHaveBeenCalledTimes(1);
      await expect(args.onChoose).toHaveBeenCalledWith('default');
    },
  };
}

export const DisabledChoice = disabledAnswer('choice');

export const DisabledAction = disabledAnswer('action');

// A loading menu opens to one busy progress row and offers nothing to choose.
function loadingMenu(kind: StatesProps['kind']): Story {
  return {
    args: { kind, loading: true },
    play: async ({ canvas, canvasElement, userEvent, args }) => {
      await settleLayout('wide');
      const page = within(canvasElement.ownerDocument.body);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Permissions' }),
      );

      const progress = await page.findByRole('menuitem', {
        name: menuLoadingLabel,
      });

      await expect(progress).toHaveAttribute('aria-busy', 'true');
      await expect(
        page.getByRole('progressbar', { name: menuLoadingLabel }),
      ).toBeInTheDocument();
      await expect(
        page.queryByRole(itemRole(kind), { name: 'Default' }),
      ).not.toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      await waitFor(() =>
        expect(page.queryByRole('menu')).not.toBeInTheDocument(),
      );
      await expect(args.onChoose).not.toHaveBeenCalled();
    },
  };
}

export const LoadingChoices = loadingMenu('choice');

export const LoadingActions = loadingMenu('action');

// The window frame's 8px inset, written out so the test does not read the value it checks.
const edgeMargin = 8;

// A menu aligned to a trigger against the window's right edge shifts left and stops short of that edge.
export const StaysInsideTheWindowEdge: Story = {
  render: ({ onChoose }) => (
    <View className="fixed top-6 right-0">
      <Menu
        accessibilityLabel="Permissions"
        align="start"
        trigger={trigger}
        actions={answers.map((answer) => ({
          label: answer.label,
          onPress: () => onChoose(answer.value),
        }))}
      />
    </View>
  ),
  play: async ({ canvas, canvasElement, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(canvas.getByRole('button', { name: 'Permissions' }));

    const menu = await within(canvasElement.ownerDocument.body).findByRole(
      'menu',
    );

    await expect(menu.getBoundingClientRect().right).toBeLessThanOrEqual(
      window.innerWidth - edgeMargin,
    );
  },
};
