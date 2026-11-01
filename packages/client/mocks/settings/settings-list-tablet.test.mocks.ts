import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, waitFor } from 'storybook/test';
import { widePages as everyPage } from './settings-list-navigation.test.mocks';
import type { Story } from './settings-list-story.test.mocks';

// A tablet held in portrait is medium and not a phone: every page stays, as it does in landscape.
export function tabletPortraitKeepsEveryPage(
  width: number,
  height: number,
): Story {
  return {
    play: async ({ canvas }) => {
      await settleLayout(width, height);
      await waitFor(() =>
        expect(
          canvas
            .getAllByRole('link')
            .map((link) => link.getAttribute('aria-label')?.split(',')[0]),
        ).toEqual(everyPage),
      );

      for (const name of everyPage) {
        const row = canvas.getByRole('link', {
          name: new RegExp(`^${name}(?:,|$)`),
        });

        const bounds = row.getBoundingClientRect();

        await expect(row).toBeVisible();
        await expect(bounds.left).toBeGreaterThanOrEqual(0);
        await expect(bounds.right).toBeLessThanOrEqual(width);
      }
    },
  };
}
