import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { layoutWidths } from '#kit/each-layout';
import { settleViewport } from '#kit/settle-viewport';
import { SearchFieldExample } from './search-field-example.mocks';

const label = 'Search Agents';

const meta = {
  title: 'Tests/Design System/Primitives/Inputs/SearchField',
  component: SearchFieldExample,
} satisfies Meta<typeof SearchFieldExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PutsSearchLast: Story = {
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole('button');
    await expect(
      buttons.map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Add item', label]);
  },
};

function opensFocusesAndClears(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      if ('__vitest_browser__' in globalThis) await settleViewport(width);
      await expect(canvas.queryByRole('textbox')).toBeNull();
      await userEvent.click(canvas.getByRole('button', { name: label }));
      const field = canvas.getByRole('textbox', { name: label });
      await waitFor(() => expect(field).toHaveFocus());
      // The field covers the whole row, so the other actions leave the accessibility tree.
      await expect(
        canvas.queryByRole('button', { name: 'Add item' }),
      ).toBeNull();
      await userEvent.type(field, 'review');
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close search' }),
      );
      await waitFor(() => expect(canvas.queryByRole('textbox')).toBeNull());
      await expect(canvas.getByRole('button', { name: label })).toHaveFocus();
      await userEvent.click(canvas.getByRole('button', { name: label }));
      await expect(canvas.getByRole('textbox', { name: label })).toHaveValue(
        '',
      );
    },
  };
}

export const OpensFocusesAndClearsPhone = opensFocusesAndClears(
  layoutWidths.phone,
);

export const OpensFocusesAndClearsWide = opensFocusesAndClears(
  layoutWidths.wide,
);

export const EscapeCloses: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: label }));
    await waitFor(() =>
      expect(canvas.getByRole('textbox', { name: label })).toHaveFocus(),
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByRole('textbox')).toBeNull());
    await expect(canvas.getByRole('button', { name: label })).toHaveFocus();
  },
};

export const StartsOpenWithAQuery: Story = {
  args: { initial: 'review' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: label })).toHaveValue(
      'review',
    );
  },
};
