import { settleLayout } from '@repo/kit/mocks/story-layout';
import { waitFor } from 'storybook/test';

/*
 * The largest text sizes, as the Composer meets them. Dynamic Type raises the type tokens each kit role reads, and the
 * Composer's pills, draft and Send are set in the control role, so a story raises that role's tokens on its own root.
 * iOS applies the reader's size itself; this pins what the layout does with it (#1529, #1606).
 */
const scaledControlType = {
  '--text-control': '36px',
  '--leading-control': '44px',
};

// Raises the control role on the story's root, and returns what puts it back so the next story reads the ordinary size.
export function scaleControlType(root: HTMLElement): () => void {
  for (const [token, size] of Object.entries(scaledControlType))
    root.style.setProperty(token, size);

  return (): void => {
    for (const token of Object.keys(scaledControlType))
      root.style.removeProperty(token);
  };
}

// A draft long enough to wrap to several lines on a phone.
export const wrappingDraft =
  'please fix the failing build now okay and then also update the tests for the login flow thanks';

/*
 * The room an iPhone leaves a page once the keyboard is up, as a viewport height, at the reader's ordinary text size
 * and at the largest: the page is given that much height and nothing else, so a Composer that does not give height
 * up is drawn past the top of it, under the status bar.
 */
export const roomAboveKeyboard = { default: 170, scaled: 300 } as const;

// Runs `check` in a phone-wide viewport as tall as the room above the keyboard, at the ordinary or the largest text size.
export async function inRoomAboveKeyboard(
  scaled: boolean,
  canvasElement: HTMLElement,
  check: (room: number) => Promise<void>,
): Promise<void> {
  const room = scaled ? roomAboveKeyboard.scaled : roomAboveKeyboard.default;
  const restore = scaled ? scaleControlType(canvasElement) : () => {};

  try {
    await settleLayout('phone', room);
    await waitFor(async () => check(room));
  } finally {
    restore();
  }
}
