import {
  messageSlotFixture,
  rewrittenMessage,
  replacementTreeFixture,
  refusedTreeFixture,
  renderThrowReason,
} from '@repo/contracts/plugins/replaceable-fixtures';
import { Text } from '@repo/kit/primitives/content/text';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, fn } from 'storybook/test';
import {
  renderCoreMessage,
  replacementState,
} from '../../../../mocks/replaceable-slot';
import { ReplaceableSlotView } from './replaceable-slot';
import { coreSlotState, type ReplaceableState } from './replaceable-state';

const meta = {
  title: 'Tests/Design System/Patterns/ReplaceableSlot',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const onFallback = fn();

const coreMessageText = 'Core message';

const restOfFeedText = 'Rest of Feed';

const draw = (
  state: ReplaceableState,
  renderCore = renderCoreMessage,
): React.JSX.Element => (
  <View>
    <ReplaceableSlotView
      input={messageSlotFixture}
      state={state}
      renderCore={renderCore}
      onEvent={fn()}
      onFallback={onFallback}
    />
    <Text>{restOfFeedText}</Text>
  </View>
);

export const PassThrough: Story = {
  render: () => draw(coreSlotState(messageSlotFixture)),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(coreMessageText)).toBeVisible();
    await expect(canvas.getByText(restOfFeedText)).toBeVisible();
  },
};

export const Rewritten: Story = {
  render: () => draw(coreSlotState(rewrittenMessage())),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Rewritten message')).toBeVisible();
    await expect(canvas.queryByText(coreMessageText)).toBeNull();
  },
};

export const Replaced: Story = {
  render: () => draw(replacementState(replacementTreeFixture)),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Plugin replacement')).toBeVisible();
    await expect(canvas.queryByText(coreMessageText)).toBeNull();
    await expect(canvas.getByText(restOfFeedText)).toBeVisible();
  },
};

export const RefusedWhole: Story = {
  render: () => draw(replacementState(refusedTreeFixture)),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(coreMessageText)).toBeVisible();
    await expect(canvas.queryByText('Plugin replacement')).toBeNull();
    await expect(onFallback).toHaveBeenCalledWith(
      'FuturePart is not a kit part',
    );
  },
};

function ThrowingDrawing(): never {
  throw new Error(renderThrowReason);
}

export const ThrowStaysLocal: Story = {
  render: () =>
    draw(coreSlotState(rewrittenMessage()), (input) =>
      input === messageSlotFixture ? (
        renderCoreMessage(input)
      ) : (
        <ThrowingDrawing />
      ),
    ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(coreMessageText)).toBeVisible();
    await expect(canvas.getByText(restOfFeedText)).toBeVisible();
    await expect(onFallback).toHaveBeenCalledWith(renderThrowReason);
  },
};
