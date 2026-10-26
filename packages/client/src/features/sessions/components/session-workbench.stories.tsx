import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { SessionWorkbench } from './session-workbench';
import { allSections } from './session-workbench-fixtures';

// The Workbench column at its product width.
const meta = {
  title: 'Sessions/SessionWorkbench',
  component: SessionWorkbench,
  parameters: { screenPreview: true },
  decorators: [
    (Story): ReactElement => (
      <View className="m-4 w-frame-list">
        <Story />
      </View>
    ),
  ],
  argTypes: {
    panels: {
      control: false,
      description:
        'What the Session offers: which sections, their counts, the Changes preview and the Agents summary.',
    },
  },
  args: {
    panels: {
      ...allSections,
      onSelect: fn(),
      onToggle: fn(),
      onOpenChanges: fn(),
    },
  },
} satisfies Meta<typeof SessionWorkbench>;

export default meta;

type Story = StoryObj<typeof meta>;

// Every section the Session offers: Changes, Agents and Shells, each on its own card with only its title, chevron and handle on the title line.
export const AllSections: Story = {};
