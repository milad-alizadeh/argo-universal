import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { PluginTree } from './plugin-registry';
import {
  attachedSessionsTree,
  WithSessionRows,
} from './plugin-session-rows-fixtures';

const meta = {
  title: 'Design System/Patterns/PluginSessionRows',
  component: PluginTree,
  parameters: { screenPreview: true },
  argTypes: { root: { control: false }, onPageCall: { control: false } },
  decorators: [
    (Story) => (
      <WithSessionRows>
        <Story />
      </WithSessionRows>
    ),
  ],
} satisfies Meta<typeof PluginTree>;

export default meta;

type Story = StoryObj<typeof meta>;

// A Plugin's page draws each attached Session as the App's own Session row.
export const AttachedSessions: Story = { args: { root: attachedSessionsTree } };
