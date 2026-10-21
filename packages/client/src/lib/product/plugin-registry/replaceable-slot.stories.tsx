import {
  messageSlotFixture,
  rewrittenMessage,
  replacementTreeFixture,
} from '@repo/contracts/plugins/replaceable-fixtures';
import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  renderCoreMessage,
  replacementState,
} from '../../../../mocks/replaceable-slot';
import { ReplaceableSlotView } from './replaceable-slot';
import { coreSlotState, type ReplaceableState } from './replaceable-state';

const meta = {
  title: 'Shared/ReplaceableSlot',
  component: ReplaceableSlotView,
} satisfies Meta;

export default meta;

function preview(state: ReplaceableState): React.JSX.Element {
  return (
    <ReplaceableSlotView
      input={messageSlotFixture}
      state={state}
      renderCore={renderCoreMessage}
      onEvent={() => {}}
      onFallback={() => {}}
    />
  );
}

export const MessageDrawings: StoryObj = {
  name: 'Replaceable Slot',
  render: () => (
    <Variations>
      <Variation label="Core and fallback">
        {preview(coreSlotState(messageSlotFixture))}
      </Variation>
      <Variation label="Rewritten props">
        {preview(coreSlotState(rewrittenMessage()))}
      </Variation>
      <Variation label="Plugin tree">
        {preview(replacementState(replacementTreeFixture))}
      </Variation>
    </Variations>
  ),
};
