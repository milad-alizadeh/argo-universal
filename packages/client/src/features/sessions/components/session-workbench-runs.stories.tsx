import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import {
  crashedRuns,
  partiallyReadyGroup,
  readyGroup,
  readyGroupRuns,
  startingRuns,
  stoppedGroup,
  stoppedRuns,
  workbenchRuns,
  workbenchRunTime,
} from '../../../../mocks/run-configurations';
import { SessionWorkbenchColumn } from './session-workbench';
import {
  WorkbenchRuns,
  type WorkbenchRunsProps,
} from './session-workbench-runs';

function RunsCard(props: WorkbenchRunsProps): ReactElement {
  return (
    <View className="m-4 w-frame-list">
      <SessionWorkbenchColumn
        sections={[
          { key: 'runs', title: 'Runs', summary: <WorkbenchRuns {...props} /> },
        ]}
      />
    </View>
  );
}

const meta = {
  title: 'Sessions/SessionWorkbenchRuns',
  component: WorkbenchRuns,
  render: RunsCard,
  argTypes: {
    runs: {
      control: false,
      description: 'Run Configurations for the Checkout.',
    },
    defaultGroup: {
      control: false,
      description: 'Default Run group progress and actions for the Checkout.',
    },
    now: {
      control: false,
      description: 'Current time for the starting state.',
    },
    onOpen: { control: false, description: 'Open a Run’s Terminal.' },
    onStart: { control: false, description: 'Start a Run Configuration.' },
    onStop: { control: false, description: 'Stop a Run.' },
  },
  args: {
    runs: workbenchRuns,
    now: workbenchRunTime,
    onOpen: fn(),
    onStart: fn(),
    onStop: fn(),
  },
} satisfies Meta<typeof WorkbenchRuns>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Mixed: Story = {};

export const Stopped: Story = { args: { runs: stoppedRuns } };

export const Starting: Story = { args: { runs: startingRuns } };

export const Crashed: Story = { args: { runs: crashedRuns } };

export const GroupStopped: Story = {
  args: {
    runs: stoppedRuns,
    defaultGroup: { status: stoppedGroup, onStart: fn(), onStop: fn() },
  },
};

export const GroupStarting: Story = {
  args: {
    runs: startingRuns,
    defaultGroup: { status: stoppedGroup, onStart: fn(), onStop: fn() },
  },
};

export const GroupPartiallyReady: Story = {
  args: {
    defaultGroup: { status: partiallyReadyGroup, onStart: fn(), onStop: fn() },
  },
};

export const GroupReady: Story = {
  args: {
    runs: readyGroupRuns,
    defaultGroup: { status: readyGroup, onStart: fn(), onStop: fn() },
  },
};
