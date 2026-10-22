import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { WorkbenchColumn } from './workbench-column';
import { allSections } from './workbench-column-fixtures';

// Paper 24JC-0: Components / WorkbenchColumn at its product width.
const meta = {
  title: 'Sessions/WorkbenchColumn',
  component: WorkbenchColumn,
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
} satisfies Meta<typeof WorkbenchColumn>;

export default meta;

type Story = StoryObj<typeof meta>;

// Every section the Session offers: Changes, Agents and Shells, each on its own card.
export const AllSections: Story = {};
