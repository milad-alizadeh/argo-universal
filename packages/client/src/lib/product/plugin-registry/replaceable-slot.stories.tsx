import {
  messageSlotFixture,
  replacementTreeFixture,
} from '@repo/contracts/plugins/replaceable-fixtures';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  renderCoreMessage,
  replacementState,
  rewrittenMessage,
} from '../../../../mocks/replaceable-slot';
import { Variation, Variations } from '../../generic/variations';
import { ReplaceableSlotView } from './replaceable-slot';
import { coreSlotState, type ReplaceableState } from './replaceable-state';

const meta = {
  title: 'Shared/ReplaceableSlot',
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

export const MessageDrawings: StoryObj<typeof meta> = {
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
