import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { Composer } from './composer';
import { bandListeningComposer } from './composer-conversation-band-fixtures';
import { conversationComposer } from './composer-conversation-fixtures';
import presentation from './composer-conversation.stories';
import { microphoneButtonId } from './composer-mute-buttons';
import { endButtonId } from './composer-primary-action';

// Drawn as the Composer's voice stories draw it, in the Session column, so the row has the width it has there.
const meta = {
  title: 'Tests/Composer/Conversation/Row',
  component: Composer,
  render: presentation.render,
  parameters: presentation.parameters,
  args: presentation.args,
  argTypes: presentation.argTypes,
} satisfies Meta<typeof Composer>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

const middleOf = (element: Element): number => {
  const box = element.getBoundingClientRect();

  return Math.round(box.top + box.height / 2);
};

/*
 * Where Attach, Mode, the microphone's mute and End sit down the page; one line holds them at one height. Attach opens
 * the line, so a right-hand group that wraps as a whole still shows.
 */
const rowOf = (canvas: Canvas): number[] => [
  middleOf(canvas.getByRole('button', { name: 'Attach' })),
  middleOf(canvas.getByText('Ask first')),
  middleOf(canvas.getByTestId(microphoneButtonId)),
  middleOf(canvas.getByTestId(endButtonId)),
];

const oneLine = async (canvas: Canvas): Promise<void> => {
  await settleLayout('phone');
  await canvas.findByTestId(endButtonId);
  await waitFor(() => expect(new Set(rowOf(canvas)).size).toBe(1));
};

// On a phone's call, Mode, the microphone's mute and End share Attach's line rather than wrapping under it.
export const PhoneCallKeepsOneLine: Story = {
  args: conversationComposer,
  play: async ({ canvas }) => oneLine(canvas),
};

// The same with the band along the card's top edge.
export const PhoneBandCallKeepsOneLine: Story = {
  args: bandListeningComposer,
  play: async ({ canvas }) => oneLine(canvas),
};
