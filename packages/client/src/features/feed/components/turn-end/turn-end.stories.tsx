import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { TurnEndRow } from './turn-end';
import {
  authenticationRequiredTurnEnd,
  deniedTurnEnd,
  erroredTurnEnd,
  erroredWithoutDetailsTurnEnd,
  outputLimitTurnEnd,
  refusedTurnEnd,
  stepLimitTurnEnd,
  stoppedTurnEnd,
} from './turn-end-fixtures';

const meta = {
  title: 'Feed/TurnEnd',
  component: TurnEndRow,
  argTypes: { end: { control: false } },
  args: stoppedTurnEnd,
} satisfies Meta<typeof TurnEndRow>;

export default meta;

type Story = StoryObj<typeof meta>;

/*
 * One story per key in the component's notices table, except end_turn: a Turn that ended
 * normally draws nothing, so it has no story.
 */

// You stopped the Turn, after how long it ran.
export const Stopped: Story = { args: stoppedTurnEnd };

// You denied a Permission request and the Agent ended the Turn; not a Stop.
export const Denied: Story = { args: deniedTurnEnd };

export const OutputLimit: Story = { args: outputLimitTurnEnd };

export const StepLimit: Story = { args: stepLimitTurnEnd };

export const Refused: Story = { args: refusedTurnEnd };

export const Errored: Story = { args: erroredTurnEnd };

// The same error with no message to report.
export const ErroredWithoutDetails: Story = {
  args: erroredWithoutDetailsTurnEnd,
};

export const AuthenticationRequired: Story = {
  args: authenticationRequiredTurnEnd,
};
