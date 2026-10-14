import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Menu } from './menu';

const loadingLabel = 'Loading options…';

const deleteLabel = 'Delete Project';

const renameLabel = 'Rename Project';

type ProjectActionsProps = {
  onAction: (label: string) => void;
  loading?: boolean;
};

// Delete is shown but cannot run while the Project has open Sessions.
function ProjectActions(props: ProjectActionsProps): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel="Project actions"
      trigger="More"
      loading={props.loading}
      actions={[
        { label: renameLabel, onPress: () => props.onAction(renameLabel) },
        {
          label: deleteLabel,
          disabled: true,
          onPress: () => props.onAction(deleteLabel),
        },
      ]}
    />
  );
}

const meta = {
  title: 'Tests/Menu/ActionStates',
  component: ProjectActions,
  args: { onAction: fn() },
} satisfies Meta<typeof ProjectActions>;

export default meta;

type Story = StoryObj<typeof meta>;

// A disabled action is shown, but keyboard focus skips it and it never runs.
function disabledAction(width: number): Story {
  return {
    play: async ({ canvas, canvasElement, userEvent, args }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Project actions' }),
      );
      const remove = await page.findByRole('menuitem', { name: deleteLabel });
      await expect(remove).toHaveAttribute('aria-disabled', 'true');
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      await expect(remove).not.toHaveFocus();
      await userEvent.keyboard('{Escape}');
      await expect(args.onAction).not.toHaveBeenCalled();
    },
  };
}

export const DisabledActionWide = disabledAction(layoutWidths.wide);

export const DisabledActionPhone = disabledAction(layoutWidths.phone);

// While its actions load, the menu opens to a progress row and offers nothing to run.
function loadingActions(width: number): Story {
  return {
    args: { loading: true },
    play: async ({ canvas, canvasElement, userEvent }) => {
      await settleViewport(width);
      const page = within(canvasElement.ownerDocument.body);
      await userEvent.click(
        canvas.getByRole('button', { name: 'Project actions' }),
      );
      const menu = await page.findByRole('menu');
      await expect(
        within(menu).getByRole('progressbar', { name: loadingLabel }),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(within(menu).getByText(loadingLabel)).toBeVisible(),
      );
      await expect(page.queryByRole('menuitem')).not.toBeInTheDocument();
    },
  };
}

export const LoadingActionsWide = loadingActions(layoutWidths.wide);

export const LoadingActionsPhone = loadingActions(layoutWidths.phone);
