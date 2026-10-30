import { nextFrames } from '@repo/kit/mocks/next-frames';
import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import { screen } from 'storybook/test';

/*
 * A phone's Changes sit in the Inspector's sheet, which slides up when the window narrows. Vaul reads a press made
 * before it has arrived as the end of a swipe and closes it, so a story presses only once the sheet has stopped moving.
 */
export async function settleChanges(width: number): Promise<void> {
  await settleLayout(width);

  if (width !== layoutWidths.phone) return;

  const sheet = await sheetArrived();

  await nextFrames();
  await sheetStopped(sheet);
}

/*
 * Waits for the sheet to be in the page, however long a loaded machine takes to mount it: its arrival is a state of the
 * page, so it is watched for rather than given a clock (Testing Library's `findBy` gives up after a second). The check and
 * the observer start in one step, so a sheet that lands between them is not missed.
 */
const sheetIsIn = (): boolean => screen.queryAllByRole('dialog').length > 0;

async function sheetArrived(): Promise<HTMLElement> {
  await new Promise<void>((resolve) => {
    if (sheetIsIn()) {
      resolve();

      return;
    }

    const observer = new MutationObserver(() => {
      if (!sheetIsIn()) return;

      observer.disconnect();
      resolve();
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  });

  // Throws if more than one dialog is open: a phone's Changes story opens only the sheet.
  return screen.getByRole('dialog');
}

// Waits on the sheet's own slide, however long a loaded machine takes to run it; the spinners inside it never end.
async function sheetStopped(sheet: HTMLElement): Promise<void> {
  const running = sheet.getAnimations();

  if (running.length === 0) return;

  await Promise.allSettled(running.map((animation) => animation.finished));
  await sheetStopped(sheet);
}
