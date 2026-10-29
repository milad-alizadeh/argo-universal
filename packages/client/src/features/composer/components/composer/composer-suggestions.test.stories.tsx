import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, screen, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import {
  meta as composerMeta,
  type Story,
} from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { slashSuggestionsComposer } from './composer-fixtures';
import { SuggestionComposer } from './composer-suggestions.mocks';

const meta = { ...composerMeta, title: 'Tests/Composer/Suggestions' };

export default meta;

export const ChosenCommandSendsAsPlainText: Story = {
  args: { slashCommands: slashSuggestionsComposer.slashCommands },
  render: (args) => <SuggestionComposer {...args} />,
  play: async ({ canvas, args }) => {
    await settleLayout('wide');
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Message' }),
      '/re',
    );
    await screen.findByRole('option', { name: '/review Review a file' });
    await userEvent.keyboard('{Enter}');
    await expect(args.onSend).not.toHaveBeenCalled();
    await userEvent.keyboard('args');
    await waitFor(() =>
      expect(args.onDraftChange).toHaveBeenLastCalledWith({
        text: '/review args',
        attachments: [],
      }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(args.onSend).toHaveBeenCalledWith({
      text: '/review args',
      attachments: [],
    });
  },
};

export const ArrowsAndTabChooseTheHighlightedCommand: Story = {
  args: { slashCommands: slashSuggestionsComposer.slashCommands },
  render: (args) => <SuggestionComposer {...args} />,
  play: async ({ canvas, args }) => {
    await settleLayout('wide');
    await userEvent.type(canvas.getByRole('textbox', { name: 'Message' }), '/');
    await screen.findByRole('option', { name: '/inspect Review changes' });
    await userEvent.keyboard('{ArrowDown}{ArrowUp}{ArrowDown}{Tab}');
    await waitFor(() =>
      expect(args.onDraftChange).toHaveBeenLastCalledWith({
        text: '/review ',
        attachments: [],
      }),
    );
    await expect(args.onSend).not.toHaveBeenCalled();
  },
};

export const NoCommandsLeavesSlashAsPlainText: Story = {
  render: (args) => <SuggestionComposer {...args} />,
  play: async ({ canvas, args }) => {
    await settleLayout('wide');
    await userEvent.type(canvas.getByRole('textbox', { name: 'Message' }), '/');
    await waitFor(() =>
      expect(args.onDraftChange).toHaveBeenLastCalledWith({
        text: '/',
        attachments: [],
      }),
    );
    await expect(
      screen.queryByRole('group', { name: 'Slash commands' }),
    ).not.toBeInTheDocument();
  },
};
