import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { fn } from 'storybook/test';
import { SettingsPage } from '#lib/product/settings-page';
import { customAgentDefinition, registers } from '../custom-agent.mocks';
import {
  CustomAgentForm,
  customAgentFormDescription,
} from './custom-agent-form';

// The custom Agent screen has no view; its form carries the screen's stories (ADR-0021).
const meta = {
  title: 'Screens/Settings/Add custom Agent',
  component: CustomAgentForm,
  args: {
    submitLabel: 'Add Agent',
    onSubmit: registers(),
    onCancel: fn(),
  },
  parameters: { screenPreview: true },
  decorators: [
    (Story): React.JSX.Element => (
      <SettingsPage
        title="Add custom Agent"
        caption={customAgentFormDescription}
      >
        <Story />
      </SettingsPage>
    ),
  ],
} satisfies Meta<typeof CustomAgentForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const Editing: Story = {
  args: { initial: customAgentDefinition, submitLabel: 'Save' },
};
