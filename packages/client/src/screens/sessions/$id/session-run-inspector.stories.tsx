import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { RunInspector } from '#features/sessions';
import { runActions, webRun } from './session-run-inspector-fixtures';

const meta = {
  title: 'Screens/Sessions/Session/RunInspector',
  component: RunInspector,
  parameters: { screenPreview: true },
  render: (args): ReactElement => (
    <View className="m-4 h-160 w-frame-list rounded-lg bg-card p-3">
      <RunInspector {...args} />
    </View>
  ),
  argTypes: {
    run: { control: false, description: 'The Run in this Inspector tab.' },
    controls: { control: false, description: 'Run actions and its Terminal.' },
  },
  args: { run: webRun, controls: runActions },
} satisfies Meta<typeof RunInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
