import { shownText } from '@repo/kit/mocks/shown-text';
import {
  layoutWidths,
  settleLayout,
  wideBreakpoint,
} from '@repo/kit/mocks/story-layout';
import { expect, fn, within } from 'storybook/test';
import { waitFor } from 'storybook/test';
import { userEvent as browserUserEvent } from 'vitest/browser';
import { composerUnlistedEffortConfiguration } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { typing } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { SendingComposer } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { returnPrompt } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { agentModelLabel } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { agentIconId } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { spacingPrompt } from '../../../../../mocks/composer/composer-test-contract.test.mocks';
import { multiline } from '../../../../../mocks/composer/draft-editing.test.mocks';
import { editorScrollsAfterTenLines } from '../../../../../mocks/composer/editor-scroll.test.mocks';
import { expectAgentTextFits } from '../../../../../mocks/composer/empty-layout.test.mocks';

const meta = { ...composerTestMeta, title: 'Tests/Composer' };

export default meta;

export const MultilineWebAtPhoneWidth = multiline(layoutWidths.phone);

export const MultilineWide = multiline(layoutWidths.wide);

export const EditorScrollsAfterTenLinesPhone = editorScrollsAfterTenLines(
  layoutWidths.phone,
);

export const EditorScrollsAfterTenLinesWide = editorScrollsAfterTenLines(
  layoutWidths.wide,
);

export const Empty: Story = {
  play: async ({ canvas }) => {
    for (const width of [layoutWidths.phone, layoutWidths.wide]) {
      await settleLayout(width);
      await expect(
        shownText(canvas.getByRole('textbox', { name: 'Message' })),
      ).toBe('');
      await expect(canvas.getByRole('button', { name: 'Send' })).toBeDisabled();
      await expect(
        canvas.getByRole('button', {
          name: 'Attach',
        }),
      ).toBeEnabled();
      await expect(
        canvas.getByRole('button', { name: agentModelLabel }),
      ).not.toHaveTextContent('First Agent');
      await expect(
        canvas.getByRole('button', { name: agentModelLabel, hidden: true }),
      ).not.toHaveTextContent('(recommended)');
      await expect(canvas.queryAllByTestId(agentIconId)).toHaveLength(
        width < wideBreakpoint() ? 0 : 1,
      );

      const model = canvas
        .getByRole('button', { name: agentModelLabel })
        .getBoundingClientRect();

      const mode = canvas
        .getByRole('button', { name: 'Mode' })
        .getBoundingClientRect();

      await expect(model.right).toBeLessThanOrEqual(mode.left);

      await expectAgentTextFits(canvas);
    }
  },
};

export const TypingWebAtPhoneWidth = typing(layoutWidths.phone);

export const TypingWide = typing(layoutWidths.wide);

export const ReturnSends: Story = {
  render: () => <SendingComposer onSend={returnPrompt} />,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    const input = await canvas.findByRole('textbox', { name: 'Message' });
    await browserUserEvent.type(input, '{Enter}');
    await expect(returnPrompt).not.toHaveBeenCalled();
    await browserUserEvent.type(input, spacingPrompt);
    const shown = shownText(input);
    await browserUserEvent.keyboard('{Enter}');
    await waitFor(() => expect(returnPrompt).toHaveBeenCalledOnce());
    await expect(returnPrompt).toHaveBeenCalledWith({
      text: shown,
      attachments: [],
    });
    await expect(shown).toBe(spacingPrompt);
  },
};

// The inline Mode choices are radios: the arrow keys, Home and End move between them, one at a time.
export const ArrowKeysMoveThroughModeWide: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
    const overlay = within(document.body);
    const radios = await overlay.findAllByRole('radio');
    const [first, second] = radios;
    const last = radios.at(-1);
    first?.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(second).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(first).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect(last).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(first).toHaveFocus();
  },
};

const modeChanges = fn();

// A desktop Mode menu moves focus with an arrow; choosing waits for Enter or a pointer press.
export const ModeArrowDoesNotChooseWide: Story = {
  args: {
    configuration: {
      ...composerUnlistedEffortConfiguration,
      onConfigChange: modeChanges,
    },
  },
  beforeEach: () => modeChanges.mockClear(),
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(canvas.getByRole('button', { name: 'Mode' }));
    const overlay = within(document.body);
    const [first, second] = await overlay.findAllByRole('radio');
    first?.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(second).toHaveFocus();
    await expect(modeChanges).not.toHaveBeenCalled();
  },
};
