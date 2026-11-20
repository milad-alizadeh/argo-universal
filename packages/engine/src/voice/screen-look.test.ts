import type { AppScreenshotResult } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import type { VoiceSay } from './call-types';
import { relayWords } from './relay-words';
import { ScreenLook } from './screen-look';
import { detachedSessions } from './session-link';

const captured: AppScreenshotResult = {
  status: 'captured',
  image: { mimeType: 'image/png', data: 'cGl4ZWxz' },
};

type Looking = { look: ScreenLook; said: VoiceSay[]; taken: () => number };

function lookWith(result: AppScreenshotResult = captured): Looking {
  const said: VoiceSay[] = [];
  let takes = 0;

  const sessions = {
    ...detachedSessions,
    capture: (): Promise<AppScreenshotResult> => {
      takes += 1;

      return Promise.resolve(result);
    },
  };

  const look = new ScreenLook(sessions, { sessionId: 's1' }, (say) =>
    said.push(say),
  );

  look.answered(true);

  return { look, said, taken: () => takes };
}

const frame = (look: ScreenLook): void =>
  look.hear({ type: 'frame.requested', requestId: 'f1' });

const replyText = (said: VoiceSay[]): string | undefined =>
  said.find((say) => say.kind === 'reply')?.text;

it('captures straight away, with nobody asked first', async () => {
  const { look, said, taken } = lookWith();

  frame(look);
  await expect.poll(() => replyText(said)).toBe(relayWords.looked);

  expect(taken()).toBe(1);
  expect(said.some((say) => say.kind === 'image')).toBe(true);
});

it('says nothing can be captured when the provider’s call cannot look', async () => {
  const { look, said, taken } = lookWith();
  look.answered(false);

  frame(look);
  await expect.poll(() => replyText(said)).toBe(relayWords.noImages);

  expect(taken()).toBe(0);
});

it('tells the voice why when no picture was taken', async () => {
  const { look, said } = lookWith({ status: 'refused', reason: 'off' });

  frame(look);
  await expect.poll(() => replyText(said)).toBe(relayWords.screenOff);

  expect(said.some((say) => say.kind === 'image')).toBe(false);
});
