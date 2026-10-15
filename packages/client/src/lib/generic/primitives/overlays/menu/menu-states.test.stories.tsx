import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { contentActionClass } from '#primitives/buttons/button';
import { Text } from '#primitives/display/text';
import { Pressable } from '#primitives/pressable';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Menu } from './menu';

const loadingLabel = 'Loading options…';

interface StatesProps {
  kind: 'choice' | 'action';
  loading?: boolean;
  onChoose: (value: string) => void;
}

const answers = [
  { value: 'default', label: 'Default' },
  { value: 'full', label: 'Full access', disabled: true },
] as const;

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
        disabled: 'disabled' in answer ? answer.disabled : undefined,
        onPress: () => onChoose(answer.value),
      }))}
    />
  );
}

const meta = {
  title: 'Tests/Menu/States',
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
      await settleViewport(layoutWidths.wide);
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
      await settleViewport(layoutWidths.wide);
      const page = within(canvasElement.ownerDocument.body);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Permissions' }),
      );

      const progress = await page.findByRole('menuitem', {
        name: loadingLabel,
      });

      await expect(progress).toHaveAttribute('aria-busy', 'true');
      await expect(
        page.getByRole('progressbar', { name: loadingLabel }),
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
