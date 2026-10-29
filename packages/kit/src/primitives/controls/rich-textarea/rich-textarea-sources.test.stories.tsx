import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import { settleLayout } from '#mocks/story-layout';
import {
  RichTextareaExample,
  exampleLabel,
  follows,
  lateSource,
} from './rich-textarea-example.mocks';
import {
  exampleItem,
  optionsSource,
  twoSourcesRichTextarea,
} from './rich-textarea-sources-fixtures';
import type { ComposerSuggestion } from './rich-textarea-suggestions';

const firstOptionName = '/first First option';

const itemName = 'Item 7 Seventh item';

const meta = {
  title: 'Tests/Design System/Primitives/Controls/RichTextarea/Sources',
  component: RichTextareaExample,
  args: {
    onChangeText: fn(),
    onSubmit: fn(),
    onResourcesChange: fn(),
    suggestions: twoSourcesRichTextarea.suggestions,
  },
  beforeEach: async (): Promise<void> => {
    await settleLayout('wide');
  },
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

const lateItem = (id: string): ComposerSuggestion => ({
  id,
  label: `Late ${id}`,
  insert: `${id} `,
});

const lateName = (id: string): string => `Late ${id}`;

const optionNames = (): (string | null)[] =>
  screen.getAllByRole('option').map((option) => option.textContent);

export const ResultsShowGroupedUnderEachSourceInOrder: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    await screen.findByRole('option', { name: itemName });
    const suggestions = screen.getByText(optionsSource.title);
    const items = screen.getByText('Items');
    const first = screen.getByRole('option', { name: firstOptionName });
    const item = screen.getByRole('option', { name: itemName });
    await expect(follows(suggestions, first)).toBe(true);
    await expect(follows(first, items)).toBe(true);
    await expect(follows(items, item)).toBe(true);
  },
};

// Each story owns its late source, so no answer reaches another story.
const joining = lateSource('Late');

export const ASourceThatAnswersLateJoinsWithoutHidingTheRest: Story = {
  args: { suggestions: [optionsSource, joining.source] },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    await screen.findByRole('option', { name: firstOptionName });
    await expect(
      screen.queryByRole('option', { name: lateName('late-1') }),
    ).not.toBeInTheDocument();
    joining.answer('', [lateItem('late-1')]);
    await screen.findByRole('option', { name: lateName('late-1') });
    await expect(
      screen.getByRole('option', { name: firstOptionName }),
    ).toBeInTheDocument();
  },
};

const changing = lateSource('Late');

export const AnAnswerForAQueryThatHasChangedIsIgnored: Story = {
  args: { suggestions: [changing.source] },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/a',
    );
    await userEvent.keyboard('b');
    changing.answer('a', [lateItem('stale')]);
    changing.answer('ab', [lateItem('fresh')]);
    await screen.findByRole('option', { name: lateName('fresh') });
    await expect(
      screen.queryByRole('option', { name: lateName('stale') }),
    ).not.toBeInTheDocument();
  },
};

export const ReturnSendsWhileASlowSourceHasNothingToShow: Story = {
  args: { suggestions: [lateSource('Late').source] },
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      'Go /x',
    );
    await userEvent.keyboard('{Enter}');
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
  },
};

export const EachSourceShowsAtMostEightResults: Story = {
  args: {
    suggestions: [
      {
        id: 'many',
        title: 'Many',
        query: () =>
          Array.from({ length: 12 }, (_, index) =>
            lateItem(`many-${index + 1}`),
          ),
      },
      {
        id: 'late-many',
        title: 'Many later',
        query: () =>
          Promise.resolve(
            Array.from({ length: 12 }, (_, index) =>
              lateItem(`later-${index + 1}`),
            ),
          ),
      },
    ],
  },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      '/',
    );
    await waitFor(() => expect(optionNames()).toHaveLength(16));
    await expect(
      optionNames().filter((name) => name?.startsWith('Late many')),
    ).toHaveLength(8);
    await expect(
      optionNames().filter((name) => name?.startsWith('Late later')),
    ).toHaveLength(8);
  },
};

export const AChosenResultWithAResourceSendsItsTextAndResource: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole('textbox', { name: exampleLabel }),
      'See /it',
    );
    await screen.findByRole('option', { name: itemName });
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('See ITEM-7 '),
    );
    await waitFor(() =>
      expect(args.onResourcesChange).toHaveBeenLastCalledWith([
        exampleItem.resource,
      ]),
    );
    await userEvent.keyboard('{Backspace>7/}');
    await waitFor(() =>
      expect(args.onResourcesChange).toHaveBeenLastCalledWith([]),
    );
  },
};
