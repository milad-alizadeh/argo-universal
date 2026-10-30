import {
  layoutWidths,
  nextFrames,
  settleLayout,
} from '@repo/kit/mocks/story-layout';
import { screen } from 'storybook/test';

/*
 * A phone's Changes sit in the Inspector's sheet, which slides up when the window narrows. Vaul reads a press made
 * before it has arrived as the end of a swipe and closes it, so a story presses only once the sheet has stopped moving.
 */
export async function settleChanges(width: number): Promise<void> {
  await settleLayout(width);

  if (width !== layoutWidths.phone) return;

  const sheet = await screen.findByRole('dialog');

  await nextFrames();
  await sheetStopped(sheet);
}

// Waits on the sheet's own slide, however long a loaded machine takes to run it; the spinners inside it never end.
async function sheetStopped(sheet: HTMLElement): Promise<void> {
  const running = sheet.getAnimations();

  if (running.length === 0) return;

  await Promise.allSettled(running.map((animation) => animation.finished));
  await sheetStopped(sheet);
}
