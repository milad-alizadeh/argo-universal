import { settleLayout } from '@repo/kit/mocks/story-layout';
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

export const SlashCommandsOpensTheMenuInAnEmptyComposer: Story = {
  args: { slashCommands: slashSuggestionsComposer.slashCommands },
  render: (args) => <SuggestionComposer {...args} />,
  play: async (context) => {
    await settleLayout('wide');
    await chooseSlashCommands(context);
    await expectMenuAndFocus(context);
    await waitFor(() =>
      expect(context.args.onDraftChange).toHaveBeenLastCalledWith({
        text: '/',
        attachments: [],
      }),
    );
  },
};

export const SlashCommandsSpacesAfterText: Story = {
  args: { slashCommands: slashSuggestionsComposer.slashCommands },
  render: (args) => <SuggestionComposer {...args} />,
  play: async (context) => {
    await settleLayout('wide');
    await userEvent.type(
      context.canvas.getByRole('textbox', { name: 'Message' }),
      'Run',
    );
    await chooseSlashCommands(context);
    await expectMenuAndFocus(context);
    await waitFor(() =>
      expect(context.args.onDraftChange).toHaveBeenLastCalledWith({
        text: 'Run /',
        attachments: [],
      }),
    );
  },
};

export const SlashCommandsKeepsAWhitespaceBeforeItsSlash: Story = {
  args: { slashCommands: slashSuggestionsComposer.slashCommands },
  render: (args) => <SuggestionComposer {...args} />,
  play: async (context) => {
    await settleLayout('wide');
    await userEvent.type(
      context.canvas.getByRole('textbox', { name: 'Message' }),
      'Run ',
    );
    await chooseSlashCommands(context);
    await expectMenuAndFocus(context);
    await waitFor(() =>
      expect(context.args.onDraftChange).toHaveBeenLastCalledWith({
        text: 'Run /',
        attachments: [],
      }),
    );
  },
};

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
