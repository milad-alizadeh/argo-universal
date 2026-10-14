import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor } from 'storybook/test';
import { SearchFieldExample } from '../../../../../../mocks/search-field-mock';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { SearchField } from './search-field';

const label = 'Search Agents';

const meta = {
  title: 'Tests/SearchField',
  component: SearchFieldExample,
} satisfies Meta<typeof SearchFieldExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PutsSearchLast: Story = {
  play: async ({ canvas }) => {
    const buttons = canvas.getAllByRole('button');
    await expect(
      buttons.map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Add custom Agent', label]);
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
        canvas.queryByRole('button', { name: 'Add custom Agent' }),
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

// Only Android docks a search bar at the top of a list; the web searches from its title row.
export const DockedDrawsNothingOnTheWeb: Story = {
  render: () => (
    <SearchField
      appearance="docked"
      label={label}
      value="review"
      onChangeText={() => {}}
      leading="back"
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('textbox')).toBeNull();
    await expect(canvas.queryByRole('button')).toBeNull();
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
