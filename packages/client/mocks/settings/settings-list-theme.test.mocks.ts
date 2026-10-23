import { settleViewport } from '@repo/kit/settle-viewport';
import { expect, within } from 'storybook/test';
import type { PlayContext, Story } from './settings-list-story.test.mocks';

// The Theme group's one row, named by its title.
export const appearanceRow = (canvas: PlayContext['canvas']): HTMLElement =>
  canvas.getByRole('button', { name: 'Appearance' });

// The Appearance row opens its Picker in place and chooses the theme there, opening no page.
export function themeChoosesInPlace(width: number): Story {
  return {
    play: async ({ canvas, canvasElement, userEvent, args }) => {
      await settleViewport(width);
      await userEvent.click(appearanceRow(canvas));
      await userEvent.click(
        await within(canvasElement.ownerDocument.body).findByRole('option', {
          name: 'Dark',
        }),
      );
      await expect(args.onThemeChange).toHaveBeenLastCalledWith('dark');
      await expect(args.onSelect).not.toHaveBeenCalled();
    },
  };
}

// The search finds the Appearance row by its name, alone under Theme.
export function searchFindsAppearance(width: number): Story {
  return {
    args: { query: 'appear' },
    play: async ({ canvas }) => {
      await settleViewport(width);
      await expect(appearanceRow(canvas)).toBeVisible();
      await expect(canvas.queryByRole('link')).toBeNull();
      await expect(canvas.queryByRole('heading')).toBeNull();
      await expect(canvas.getByText('Theme')).toBeVisible();
    },
  };
}
