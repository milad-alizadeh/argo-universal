import { layoutWidths } from '@repo/kit/mocks/story-layout';
import { expect, fn, userEvent } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { sending } from '../../../../../mocks/composer/draft-editing.test.mocks';
import { disabled } from '../../../../../mocks/composer/draft-editing.test.mocks';
import { stopPrecedence } from '../../../../../mocks/composer/turn-admission.test.mocks';
import { pausedPrompts } from '../prompt-queue/prompt-queue-fixtures';
import { Composer } from './composer';

const meta = { ...composerTestMeta, title: 'Tests/Composer/Send' };

export default meta;

export const SendingPhone = sending(layoutWidths.phone);

export const SendingWide = sending(layoutWidths.wide);

export const DisabledPhone = disabled(layoutWidths.phone);

export const DisabledWide = disabled(layoutWidths.wide);

export const StopPrecedenceClaudePhone = stopPrecedence(
  layoutWidths.phone,
  0,
  false,
);

export const StopPrecedenceClaudeWide = stopPrecedence(
  layoutWidths.wide,
  0,
  false,
);

export const StopPrecedenceCodexPhone = stopPrecedence(
  layoutWidths.phone,
  1,
  false,
);

export const StopPrecedenceCodexWide = stopPrecedence(
  layoutWidths.wide,
  1,
  false,
);

export const DisabledStopClaudePhone = stopPrecedence(
  layoutWidths.phone,
  0,
  true,
);

export const DisabledStopClaudeWide = stopPrecedence(
  layoutWidths.wide,
  0,
  true,
);

export const DisabledStopCodexPhone = stopPrecedence(
  layoutWidths.phone,
  1,
  true,
);

export const DisabledStopCodexWide = stopPrecedence(layoutWidths.wide, 1, true);

export const RunningWithoutStop: Story = {
  render: (args) => (
    <Composer
      {...composerProps({ ...args, sessionStarted: true, running: true })}
    />
  ),
  args: { draft: { text: 'A draft during a Turn.', attachments: [] } },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
    await expect(
      canvas.queryByRole('button', { name: 'Stop' }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole('progressbar', { name: 'Sending' }),
    ).not.toBeInTheDocument();
    await expect(args.onSend).not.toHaveBeenCalled();
  },
};

const queueingTurn = (text: string): Story['args'] => ({
  draft: { text, attachments: [] },
  queueWhileRunning: true,
  onStop: fn(),
});

const renderRunning: Story['render'] = (args) => (
  <Composer
    {...composerProps({ ...args, sessionStarted: true, running: true })}
  />
);

// While a turn runs with nothing written, the one button is Stop.
export const RunningEmptyDraftShowsOnlyStop: Story = {
  render: renderRunning,
  args: queueingTurn(''),
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }));
    await expect(args.onStop).toHaveBeenCalled();

    for (const name of ['Send', 'Queue'])
      await expect(
        canvas.queryByRole('button', { name }),
      ).not.toBeInTheDocument();
  },
};

// A written draft turns the one button into Queue, with Send's arrow, in Stop's place.
export const RunningDraftShowsOnlyQueue: Story = {
  render: renderRunning,
  args: queueingTurn('Then run the tests.'),
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Queue' }));
    await expect(args.onSend).toHaveBeenCalledWith(args.draft);

    for (const name of ['Send', 'Stop'])
      await expect(
        canvas.queryByRole('button', { name }),
      ).not.toBeInTheDocument();
  },
};

// With the queue paused and nothing written, Send resumes the queue rather than sending an empty Prompt.
export const SendResumesPausedQueue: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: {
    draft: { text: '', attachments: [] },
    promptQueue: { ...pausedPrompts, command: fn(async () => {}) },
    onSteer: fn(),
  },
  play: async ({ canvas, args }) => {
    const send = canvas.getByRole('button', { name: 'Send' });
    await expect(
      canvas.queryByRole('button', { name: 'Resume queue' }),
    ).not.toBeInTheDocument();
    await expect(send).toBeEnabled();
    await userEvent.click(send);
    await expect(args.promptQueue?.command).toHaveBeenCalledWith({
      action: 'resume',
    });
    await expect(args.onSend).not.toHaveBeenCalled();
    await expect(args.onSteer).not.toHaveBeenCalled();
  },
};

// A written draft still sends as a Prompt while the queue is paused.
export const SendWithDraftWhilePaused: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: {
    draft: { text: 'A new Prompt.', attachments: [] },
    promptQueue: { ...pausedPrompts, command: fn(async () => {}) },
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(args.onSend).toHaveBeenCalledWith(args.draft);
    await expect(args.promptQueue?.command).not.toHaveBeenCalled();
  },
};
