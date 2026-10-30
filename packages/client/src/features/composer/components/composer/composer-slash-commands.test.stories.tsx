import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, fn, screen, waitFor, within } from 'storybook/test';
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

const slashCommandsItem = 'Slash Commands';

async function chooseSlashCommands({ canvas }: PlayContext): Promise<void> {
  await userEvent.click(await canvas.findByRole('button', { name: 'Attach' }));
  await userEvent.click(
    await within(document.body).findByRole('button', {
      name: slashCommandsItem,
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

function chosenAfter(typed: string, expected: string, moveCaret = ''): Story {
  return {
    args: { slashCommands: slashSuggestionsComposer.slashCommands },
    render: (args) => <SuggestionComposer {...args} />,
    play: async (context) => {
      await settleLayout('wide');
      await typeBeforeChoosing(context, typed);

      if (moveCaret) await userEvent.keyboard(moveCaret);

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

// The phone menu lists Slash Commands beside Camera, Photos and Files. The native field is proven by the kit RichTextarea native stories.
export const SlashCommandsIsListedInThePhoneMenu: Story = {
  args: {
    slashCommands: slashSuggestionsComposer.slashCommands,
    onAttachCamera: fn(),
    onAttachImages: fn(),
    onAttachFiles: fn(),
  },
  render: (args) => <SuggestionComposer {...args} />,
  play: async ({ canvas }) => {
    await settleLayout(layoutWidths.phone);
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Attach' }),
    );

    const overlay = within(document.body);

    for (const name of ['Camera', 'Photos', 'Files', slashCommandsItem])
      await expect(await overlay.findByRole('button', { name })).toBeVisible();
  },
};

export const SlashCommandsSpacesAfterText = chosenAfter('Run', 'Run /');

export const SlashCommandsKeepsAWhitespaceBeforeItsSlash = chosenAfter(
  'Run ',
  'Run /',
);

// The caret sits after "Run", so the slash goes there and the text after it stays.
export const SlashCommandsInsertsAtAMidTextCaret = chosenAfter(
  'Run later',
  'Run / later',
  '{ArrowLeft>6/}',
);

// A selected " later" is replaced by the slash.
export const SlashCommandsReplacesTheSelection = chosenAfter(
  'Run later',
  'Run /',
  '{Shift>}{ArrowLeft>6/}{/Shift}',
);

// A line break before the caret needs no separator.
export const SlashCommandsNeedsNoSeparatorAfterANewline = chosenAfter(
  'Run{Shift>}{Enter}{/Shift}',
  'Run\n/',
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
        name: slashCommandsItem,
      }),
    ).toBeDisabled();
  },
};
