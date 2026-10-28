import { layoutWidths } from '@repo/kit/mocks/story-layout';
import { expect } from 'storybook/test';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { sending } from '../../../../../mocks/composer/draft-editing.test.mocks';
import { disabled } from '../../../../../mocks/composer/draft-editing.test.mocks';
import { stopPrecedence } from '../../../../../mocks/composer/turn-admission.test.mocks';
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
