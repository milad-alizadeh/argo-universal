import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, within } from 'storybook/test';
import {
  meta as sessionsMeta,
  type Story,
} from '../../../../../mocks/sessions-list/sessions-list-story-context.test.mocks';
import { sessionRowLabel } from '../session-row/session-row-props';
import {
  compactStatusSessions,
  flatSessions,
  statusSessions,
} from './sessions-list-spacing-fixtures';

const meta = {
  ...sessionsMeta,
  title: 'Tests/Sessions/SessionsList/Spacing',
};

export default meta;

const [selected] = flatSessions.sessions;

if (!selected) throw new Error('The spacing fixture needs a selected Session');

const selectedTitle = selected.title;

const selectedRowName = sessionRowLabel(selected);

/*
 * Every row's content stays inside the row, whatever its status, Agent or title length. A quiet Session's age ends its
 * row, so a long title truncates instead of pushing it out.
 */
// A working Session shows no time; a quiet one ends its title line on it.
async function expectRowTime(row: HTMLElement, status: string): Promise<void> {
  const time = expect(within(row).queryByText(/^(now|\d+[smhdw])$/));

  await (status === 'running'
    ? time.not.toBeInTheDocument()
    : time.toBeVisible());
}

function rowsAt(args: typeof statusSessions, width: number): Story {
  return {
    args,
    beforeEach: () => settleLayout(width),
    play: async ({ canvas }) => {
      for (const session of args.sessions) {
        const title = await canvas.findByText(session.title);

        const button = canvas.getByRole('button', {
          name: sessionRowLabel(session),
        });

        // A row can draw its press beside its content so that accessories take their own presses.
        const row = button.contains(title) ? button : button.parentElement;

        if (!row?.contains(title))
          throw new Error('A Session title and button must share a row');

        const logo = within(row).getByTestId('session-logo');

        await expect(title).toBeVisible();
        await expect(logo).toBeVisible();
        await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
        await expectRowTime(row, session.status);
      }
    },
  };
}

function flatRows(width: number): Story {
  const rows = rowsAt(flatSessions, width);

  return {
    ...rows,
    play: async (context) => {
      await rows.play?.(context);

      const title = context.canvas.getByText(selectedTitle);
      await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
      await expect(
        context.canvas.getByRole('button', { name: selectedRowName }),
      ).toHaveAttribute('aria-pressed', 'true');
    },
  };
}

export const FlatRowsPhone = flatRows(390);

export const FlatRowsWide = flatRows(1440);

// Running, failed, idle, unread and waiting Sessions of both Agents.
export const StatusRowsWide = rowsAt(statusSessions, 1440);

export const StatusRowsPhone = rowsAt(statusSessions, 390);

export const CompactRowsWide = rowsAt(compactStatusSessions, 1440);

export const CompactRowsPhone = rowsAt(compactStatusSessions, 390);
