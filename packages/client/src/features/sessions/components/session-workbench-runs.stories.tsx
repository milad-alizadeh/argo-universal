import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { fn } from 'storybook/test';
import { SessionWorkbenchColumn } from './session-workbench';
import {
  WorkbenchRuns,
  type WorkbenchRunsProps,
} from './session-workbench-runs';
import {
  crashedRuns,
  startingRuns,
  stoppedRuns,
  workbenchRuns,
  workbenchRunTime,
} from './session-workbench-runs-fixtures';

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
