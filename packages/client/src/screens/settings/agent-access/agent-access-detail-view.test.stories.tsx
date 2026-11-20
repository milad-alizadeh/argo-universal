import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { AgentAccessDetailView } from './agent-access-detail-view';

const installLabel = 'Add Argo to your Agents';

const accessSwitch = { name: 'Agent access to Argo' };

const todoListSwitch = { name: 'Todo list' };

// A fragment of the description, not its whole copy.
const screenSightDescription = /pictures are never saved/;

const screenSightSwitch = { name: 'Screen sharing' };

const meta = {
  title: 'Tests/Screens/Settings/AgentAccess',
  component: AgentAccessDetailView,
  parameters: { screenPreview: true },
  args: {
    access: { status: 'loaded', enabled: true },
    todoList: true,
    onEnabledChange: fn(),
    onTodoListChange: fn(),
    onScreenSightChange: fn(),
    onInstall: fn(),
    onRetry: fn(),
  },
  beforeEach: (): Promise<void> => settleLayout('wide'),
} satisfies Meta<typeof AgentAccessDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ChangesAccessAndInstallsOnlyWhenPressed: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(args.onInstall).not.toHaveBeenCalled();
    await expect(canvas.getByRole('switch', accessSwitch)).toBeChecked();
    await userEvent.click(canvas.getByRole('switch', accessSwitch));
    await expect(args.onEnabledChange).toHaveBeenCalledWith(false);
    await expect(args.onInstall).not.toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: installLabel }));
    await expect(args.onInstall).toHaveBeenCalledOnce();
  },
};

export const StartsWithoutAccess: Story = {
  args: { access: { status: 'loaded', enabled: false } },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('switch', accessSwitch)).not.toBeChecked();
    await userEvent.click(canvas.getByRole('switch', accessSwitch));
    await expect(args.onEnabledChange).toHaveBeenCalledWith(true);
    await expect(args.onInstall).not.toHaveBeenCalled();
  },
};

export const TurnsTheTodoListOff: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('switch', todoListSwitch)).toBeChecked();
    await userEvent.click(canvas.getByRole('switch', todoListSwitch));
    await expect(args.onTodoListChange).toHaveBeenCalledWith(false);
    await expect(args.onEnabledChange).not.toHaveBeenCalled();
  },
};

export const TodoListWaitsForTheServer: Story = {
  args: { todoList: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('switch', todoListSwitch)).toBeDisabled();
  },
};

export const WaitsForAnInstallation: Story = {
  args: { installing: true },
  play: async ({ canvas, args }) => {
    const button = canvas.getByRole('button', {
      name: installLabel,
    });

    await expect(button).toBeDisabled();
    await expect(args.onInstall).not.toHaveBeenCalled();
  },
};

export const DisconnectedControlsStayInactive: Story = {
  args: { access: { status: 'disconnected' } },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('switch', accessSwitch)).toBeDisabled();
    await expect(
      canvas.getByRole('button', { name: installLabel }),
    ).toBeDisabled();
    await expect(canvas.getByText(/Connect to the Server/)).toBeVisible();
    await expect(args.onInstall).not.toHaveBeenCalled();
  },
};

export const RetriesLoading: Story = {
  args: { access: { status: 'error' } },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('switch', accessSwitch)).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
    await expect(args.onInstall).not.toHaveBeenCalled();
  },
};

export const ReportsIncompleteInstallation: Story = {
  args: {
    error:
      'Could not add Argo instructions: 2 of 3 files updated. Run Add Argo to your Agents again to repair them.',
  },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByText(/2 of 3 files updated/)).toBeVisible();
    await expect(
      canvas.queryByText(/instructions added to your Agents/),
    ).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: installLabel }));
    await expect(args.onInstall).toHaveBeenCalledOnce();
  },
};

export const TurnsScreenSightOnForThisDevice: Story = {
  args: { screenSight: false },
  play: async ({ canvas, args, userEvent }) => {
    await expect(
      canvas.getByRole('switch', screenSightSwitch),
    ).not.toBeChecked();
    await userEvent.click(canvas.getByRole('switch', screenSightSwitch));
    await expect(canvas.getByText(screenSightDescription)).toBeVisible();
    await expect(args.onScreenSightChange).toHaveBeenCalledWith(true);
    await expect(args.onEnabledChange).not.toHaveBeenCalled();
  },
};

export const TurnsScreenSightOff: Story = {
  args: { screenSight: true },
  play: async ({ canvas, args, userEvent }) => {
    await expect(canvas.getByRole('switch', screenSightSwitch)).toBeChecked();
    await userEvent.click(canvas.getByRole('switch', screenSightSwitch));
    await expect(args.onScreenSightChange).toHaveBeenCalledWith(false);
  },
};

// A phone and a browser cannot capture, so the page gives them no switch.
export const ScreenSightIsAbsentWhereThisAppCannotCapture: Story = {
  args: { onScreenSightChange: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('switch', screenSightSwitch)).toBeNull();
    await expect(canvas.queryByText(screenSightDescription)).toBeNull();
  },
};

// Screen sharing is a Device preference: it works with no Server answer.
export const ScreenSightNeedsNoServer: Story = {
  args: { access: { status: 'disconnected' }, screenSight: false },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('switch', screenSightSwitch)).toBeEnabled();
  },
};
