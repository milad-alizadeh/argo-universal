import { expect, fn, userEvent } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { Composer } from './composer';
import { endButtonId } from './composer-primary-action';
import type { ComposerVoice } from './composer-types';

const meta = { ...composerTestMeta, title: 'Tests/Composer/Voice' };

export default meta;

const voice = (call: ComposerVoice['call']): ComposerVoice => ({
  usable: true,
  call,
  onStart: fn(),
  onEnd: fn(),
});

// The call is starting: the call's own button is already there, and pressing it hangs up.
export const Connecting: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: { voice: voice('connecting') },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Send' }),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByTestId(endButtonId));
    await expect(args.voice?.onEnd).toHaveBeenCalledOnce();
  },
};

// Text in the draft makes the button Send, even on a call.
export const SendDuringCall: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: {
    voice: voice('connected'),
    draft: { text: 'A pasted stack trace.', attachments: [] },
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByTestId(endButtonId)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(args.onSend).toHaveBeenCalledWith(args.draft);
    await expect(args.voice?.onEnd).not.toHaveBeenCalled();
  },
};
