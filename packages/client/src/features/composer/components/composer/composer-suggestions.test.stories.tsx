import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, screen, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import {
  meta as composerMeta,
  type Story,
} from '../../../../../mocks/composer/composer-story-context.test.mocks';
import {
  secondSourceComposer,
  seventhItem,
  slashSuggestionsComposer,
} from './composer-fixtures';
import { SuggestionComposer } from './composer-suggestions.mocks';

const inspectName = '/inspect Review changes';

const reviewName = '/review Review a file';

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
    await screen.findByRole('option', { name: reviewName });
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

// The menu marks the highlighted option as selected.
const expectHighlighted = (name: string): Promise<void> =>
  waitFor(() =>
    expect(screen.getByRole('option', { selected: true })).toHaveAccessibleName(
      name,
    ),
  );

export const ArrowsAndTabChooseTheHighlightedCommand: Story = {
  args: { slashCommands: slashSuggestionsComposer.slashCommands },
  render: (args) => <SuggestionComposer {...args} />,
  play: async ({ canvas, args }) => {
    await settleLayout('wide');
    await userEvent.type(canvas.getByRole('textbox', { name: 'Message' }), '/');
    await screen.findByRole('option', { name: inspectName });
    await expectHighlighted(inspectName);
    await userEvent.keyboard('{ArrowDown}');
    await expectHighlighted(reviewName);
    await userEvent.keyboard('{ArrowUp}');
    await expectHighlighted(inspectName);
    await userEvent.keyboard('{ArrowDown}');
    await expectHighlighted(reviewName);
    await userEvent.keyboard('{Tab}');
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

export const ChosenResultSendsItsTextAndResource: Story = {
  args: secondSourceComposer,
  render: (args) => <SuggestionComposer {...args} />,
  play: async ({ canvas, args }) => {
    await settleLayout('wide');
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Message' }),
      '/item',
    );
    await screen.findByRole('option', { name: 'Item 7 Seventh item' });
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onDraftChange).toHaveBeenLastCalledWith({
        text: 'ITEM-7 ',
        attachments: [],
        resources: [seventhItem.resource],
      }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(args.onSend).toHaveBeenCalledWith({
      text: 'ITEM-7 ',
      attachments: [],
      resources: [seventhItem.resource],
    });
  },
};

export const DeletingTheResultsTextDropsItsResource: Story = {
  args: secondSourceComposer,
  render: (args) => <SuggestionComposer {...args} />,
  play: async ({ canvas, args }) => {
    await settleLayout('wide');
    const field = canvas.getByRole('textbox', { name: 'Message' });
    await userEvent.type(field, '/item');
    await screen.findByRole('option', { name: 'Item 7 Seventh item' });
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onDraftChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ resources: [seventhItem.resource] }),
      ),
    );
    await userEvent.keyboard('{Backspace>7/}');
    await waitFor(
      () =>
        expect(args.onDraftChange).toHaveBeenLastCalledWith({
          text: '',
          attachments: [],
        }),
      { timeout: 4000 },
    );
  },
};
