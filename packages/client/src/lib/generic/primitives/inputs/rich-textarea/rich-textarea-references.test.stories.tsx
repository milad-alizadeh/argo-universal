import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { userEvent } from 'vitest/browser';
import {
  exampleLabel as label,
  RichTextareaExample,
} from '../../../../../../mocks/rich-textarea-example';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { type ReferenceOption, shortTitle } from './rich-textarea-references';

// `#` opens the Issues and pull requests to reference; a chosen one is written as `#123`.

const references: ReferenceOption[] = [
  {
    number: 443,
    title: 'Composer editor: markdown shortcuts and tokens',
    state: 'open',
  },
  { number: 427, title: 'Composer sheet and configuration', state: 'open' },
  {
    number: 412,
    title: 'Spec 0010: Argo owns its primitives',
    state: 'done',
  },
];

const meta = {
  title: 'Tests/RichTextareaReferences',
  component: RichTextareaExample,
  args: { onChangeText: fn(), onSubmit: fn(), references },
  beforeEach: async (): Promise<void> => {
    await settleViewport(layoutWidths.wide);
  },
} satisfies Meta<typeof RichTextareaExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HashOpensTheMatchingReferences: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'See #comp');

    const menu = await screen.findByRole('listbox');

    await expect(menu).toBeVisible();
    await expect(screen.getAllByRole('option')).toHaveLength(2);
  },
};

export const ReturnChoosesTheHighlightedReference: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'Follow-up to #44');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('Follow-up to #443 '),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  },
};

export const ClickingARowChoosesIt: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '#');
    await userEvent.click(await screen.findByRole('option', { name: /#412/ }));
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('#412 '),
    );
  },
};

export const HashAndASpaceStaysText: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '# Notes');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('# Notes'),
    );
    await expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  },
};

export const ATypedNumberOfAKnownReferenceBecomesAToken: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, 'Closes #427 now');
    await waitFor(() =>
      expect(args.onChangeText).toHaveBeenLastCalledWith('Closes #427 now'),
    );
    await expect(
      canvas.getByText(shortTitle(references[1]?.title ?? '')),
    ).toBeVisible();
  },
};

export const EscapeClosesTheMenuAndKeepsTheText: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('textbox', { name: label });
    await userEvent.type(field, '#comp');
    await screen.findByRole('listbox');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument(),
    );
    await expect(args.onChangeText).toHaveBeenLastCalledWith('#comp');
  },
};
