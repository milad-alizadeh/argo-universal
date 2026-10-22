import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fireEvent, waitFor, within } from 'storybook/test';
import { Stage } from './session-inspector-stage.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/ListBackThermo',
  render: (): ReactElement => <Stage />,
  beforeEach: (): Promise<void> => settleViewport(1920),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function visibleRow(list: HTMLElement, rows: HTMLElement[]): HTMLElement {
  const bounds = list.getBoundingClientRect();

  const row = rows.find((one) => {
    const rect = one.getBoundingClientRect();

    return rect.top >= bounds.top && rect.bottom <= bounds.bottom;
  });

  if (!row)
    throw new Error('Fixture needs a fully visible item after scrolling');

  return row;
}

function returnsToList(label: string, rowName: RegExp, back: string): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(
        canvas.getByRole('tab', { name: new RegExp(label) }),
      );
      const panel = within(canvas.getByRole('tabpanel', { name: label }));
      const list = panel.getByTestId('desktop-inspector-scroll');

      list.scrollTop = 500;
      await fireEvent.scroll(list);
      await waitFor(() => expect(list.scrollTop).toBeGreaterThan(400));

      const row = visibleRow(
        list,
        panel.getAllByRole('button', { name: rowName }),
      );

      const before = list.scrollTop;

      await userEvent.click(row);
      await expect(panel.queryByRole('button', { name: rowName })).toBeNull();
      await userEvent.click(canvas.getByRole('button', { name: back }));
      await waitFor(() =>
        expect(
          panel.getByTestId('desktop-inspector-scroll').scrollTop,
        ).toBeCloseTo(before, 0),
      );
    },
  };
}

export const AgentBackRetainsList = returnsToList(
  'Agents',
  /^Inspect module/,
  'Back to Subagents',
);

export const ShellBackRetainsList = returnsToList(
  'Shells',
  /^pnpm check-module/,
  'Back to Shells',
);
