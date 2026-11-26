import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { action } from 'storybook/actions';
import { AgentAccessDetailView } from './agent-access-detail-view';
import { alwaysAllowed } from './agent-access-detail-view-fixtures';

const meta = {
  title: 'Screens/Settings/AgentAccess',
  component: AgentAccessDetailView,
  argTypes: {
    access: { control: false },
    saving: { control: 'boolean' },
    installing: { control: 'boolean' },
    installed: { control: 'select', options: ['written', 'updated'] },
    error: { control: 'text' },
    todoList: { control: 'boolean' },
    screenSight: { control: 'boolean' },
  },
  parameters: { screenPreview: true },
  args: {
    access: { status: 'loaded', enabled: true },
    todoList: true,
    screenSight: false,
    onEnabledChange: action('change Agent access'),
    onTodoListChange: action('change the Todo list setting'),
    onScreenSightChange: action('change Screen sharing'),
    grants: [],
    onRevokeGrant: action('revoke an Always allow grant'),
    onInstall: action('add Argo instructions'),
    onRetry: action('retry loading Agent access'),
  },
} satisfies Meta<typeof AgentAccessDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Enabled: Story = {};

export const Disabled: Story = {
  args: { access: { status: 'loaded', enabled: false } },
};

export const AlwaysAllowed: Story = { args: { grants: alwaysAllowed } };

export const TodoListOff: Story = { args: { todoList: false } };

export const ScreenSightOn: Story = { args: { screenSight: true } };

export const Saving: Story = { args: { saving: true } };

export const Installing: Story = { args: { installing: true } };

export const Added: Story = { args: { installed: 'written' } };

export const Updated: Story = { args: { installed: 'updated' } };

export const Loading: Story = { args: { access: { status: 'loading' } } };

export const LoadError: Story = { args: { access: { status: 'error' } } };

export const Disconnected: Story = {
  args: { access: { status: 'disconnected' } },
};

export const InstallError: Story = {
  args: {
    error:
      'Could not add Argo instructions: 2 of 3 files updated. Run Add Argo to your Agents again to repair them.',
  },
};
