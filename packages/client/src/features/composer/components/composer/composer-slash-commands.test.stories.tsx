import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, screen, waitFor, within } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import {
  meta as composerMeta,
  type PlayContext,
  type Story,
} from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { slashSuggestionsComposer } from './composer-fixtures';
import { SuggestionComposer } from './composer-suggestions.mocks';

const meta = { ...composerMeta, title: 'Tests/Composer/SlashCommands' };

export default meta;

async function chooseSlashCommands({ canvas }: PlayContext): Promise<void> {
  await userEvent.click(await canvas.findByRole('button', { name: 'Attach' }));
  await userEvent.click(
    await within(document.body).findByRole('button', {
      name: 'Slash Commands',
    }),
  );
}

async function expectMenuAndFocus({ canvas }: PlayContext): Promise<void> {
  await screen.findByRole('option', { name: '/review Review a file' });
  await expect(canvas.getByRole('textbox', { name: 'Message' })).toHaveFocus();
}

async function typeBeforeChoosing(
  { canvas }: PlayContext,
  typed: string,
): Promise<void> {
  if (!typed) return;

  await userEvent.type(canvas.getByRole('textbox', { name: 'Message' }), typed);
}

function chosenAfter(
  typed: string,
  expected: string,
  width: number | 'wide' = 'wide',
): Story {
  return {
    args: { slashCommands: slashSuggestionsComposer.slashCommands },
    render: (args) => <SuggestionComposer {...args} />,
    play: async (context) => {
      await settleLayout(width);
      await typeBeforeChoosing(context, typed);
      await chooseSlashCommands(context);
      await expectMenuAndFocus(context);
      await waitFor(() =>
        expect(context.args.onDraftChange).toHaveBeenLastCalledWith({
          text: expected,
          attachments: [],
        }),
      );
    },
  };
}

export const SlashCommandsOpensTheMenuInAnEmptyComposer = chosenAfter('', '/');

export const SlashCommandsOpensTheMenuOnAPhone = chosenAfter(
  '',
  '/',
  layoutWidths.phone,
);

export const SlashCommandsSpacesAfterText = chosenAfter('Run', 'Run /');

export const SlashCommandsKeepsAWhitespaceBeforeItsSlash = chosenAfter(
  'Run ',
  'Run /',
);

export const SlashCommandsIsOffWithoutCommands: Story = {
  render: (args) => <SuggestionComposer {...args} />,
  play: async ({ canvas }) => {
    await settleLayout('wide');
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Attach' }),
    );
    await expect(
      await within(document.body).findByRole('button', {
        name: 'Slash Commands',
      }),
    ).toBeDisabled();
  },
};
