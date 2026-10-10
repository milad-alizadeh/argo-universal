import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { CustomAgentForm } from './custom-agent-form';
import { customAgentDefinition, registers } from './custom-agent.mocks';
import { SettingsScroll } from './settings-scroll';

// The custom Agent screen has no view; its form carries the screen's stories (ADR-0021).
const meta = {
  title: 'Screens/CustomAgentScreen',
  component: CustomAgentForm,
  args: {
    submitLabel: 'Add Agent',
    onSubmit: registers(),
    onCancel: fn(),
  },
  parameters: { screenPreview: true },
  decorators: [
    (Story): React.JSX.Element => (
      <SettingsScroll>
        <Story />
      </SettingsScroll>
    ),
  ],
} satisfies Meta<typeof CustomAgentForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const Editing: Story = {
  args: { initial: customAgentDefinition, submitLabel: 'Save' },
};
