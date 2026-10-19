import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { ChangesInspector } from './changes-inspector';
import {
  ChangesInspectorSheet,
  changesArgs,
  manyFiles,
} from './changes-inspector.mocks';

// Paper: Feed & Inspector, Session Explorations, Flow / Changes comparison (owner, 2026-10-19).
const meta = {
  title: 'Frame/ChangesInspector',
  component: ChangesInspector,
  decorators: [
    (Story): React.JSX.Element => (
      <View className="h-175 w-full">
        <Story />
      </View>
    ),
  ],
  args: changesArgs,
} satisfies Meta<typeof ChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AFewFiles: Story = {};

export const ManyFiles: Story = { args: { files: manyFiles, viewed: [] } };

export const NoChanges: Story = { args: { files: [] } };

export const NoUncommittedChanges: Story = {
  args: { files: [], comparison: { kind: 'uncommitted' } },
};

export const ComparedAgainstABranch: Story = {
  args: { comparison: { kind: 'branch', branch: 'release/2.4' } },
};

export const Loading: Story = { args: { files: undefined } };

export const CouldNotLoad: Story = {
  args: {
    files: undefined,
    loadError: "Git couldn't find main in this Project.",
  },
};

export const Expanded: Story = { args: { expanded: true } };

// The phone shell's Inspector sheet.
export const InASheet: Story = {
  render: (args) => <ChangesInspectorSheet {...args} />,
};
