import { settleLayout } from '@repo/kit/mocks/story-layout';
import { sessionRows } from '@repo/mocks/app';
import { expect } from 'storybook/test';
import { SessionsPreviewMock } from '../sessions-preview-mock';
import {
  noMatches,
  type Story,
} from './sessions-view-story-context.test.mocks';

function searchPreview(width: number, query: string): Story {
  return {
    args: { query, sessions: [sessionRows.running, sessionRows.idle] },
    render: (args) => <SessionsPreviewMock {...args} />,
    beforeEach: async () => {
      await settleLayout(width);
    },
  };
}

export function matchingSearch(width: number): Story {
  return {
    ...searchPreview(width, 'setting'),
    play: async ({ canvas, userEvent }) => {
      const input = canvas.getByRole('textbox', { name: 'Search Sessions' });
      await userEvent.type(input, 's');
      await expect(input).toHaveValue('settings');
      await expect(
        await canvas.findByRole('button', {
          name: 'Build the settings screen, Running',
        }),
      ).toBeVisible();
      await expect(
        canvas.queryByRole('button', { name: 'Finished work, Idle' }),
      ).toBeNull();
    },
  };
}

export function noMatchingSearch(width: number): Story {
  return {
    ...searchPreview(width, 'settings'),
    play: async ({ canvas, userEvent }) => {
      await userEvent.type(
        canvas.getByRole('textbox', { name: 'Search Sessions' }),
        'xyz',
      );
      await expect(await canvas.findByText(noMatches)).toBeVisible();
      await expect(
        canvas.queryByRole('button', {
          name: 'Build the settings screen, Running',
        }),
      ).toBeNull();
    },
  };
}

export function closingSearch(width: number): Story {
  return {
    ...searchPreview(width, 'xyz'),
    play: async ({ canvas, userEvent }) => {
      await userEvent.click(
        canvas.getByRole('button', { name: 'Close search' }),
      );
      await expect(
        await canvas.findByRole('button', { name: 'Finished work, Idle' }),
      ).toBeVisible();
      await expect(canvas.queryByText(noMatches)).toBeNull();
    },
  };
}
