import type { AppScreenshotResult } from '@repo/contracts/operations';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { VoiceSay } from './call-types';
import { relayWords } from './relay-words';
import { ScreenLook } from './screen-look';
import { detachedSessions } from './session-link';

const captured: AppScreenshotResult = {
  status: 'captured',
  image: { mimeType: 'image/png', data: 'cGl4ZWxz' },
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

type Looking = { look: ScreenLook; said: VoiceSay[]; taken: () => number };

function lookWith(): Looking {
  const said: VoiceSay[] = [];
  let takes = 0;

  const sessions = {
    ...detachedSessions,
    capture: (): Promise<AppScreenshotResult> => {
      takes += 1;

      return Promise.resolve(captured);
    },
  };

  const look = new ScreenLook(
    sessions,
    { sessionId: 's1', images: true },
    (say) => said.push(say),
  );

  return { look, said, taken: () => takes };
}

const replyText = (said: VoiceSay[]): string | undefined =>
  said.find((say) => say.kind === 'reply')?.text;

it('refuses an ask the person made long before the voice requested the picture', async () => {
  const { look, said, taken } = lookWith();

  look.personSpoke();
  await vi.advanceTimersByTimeAsync(60_000);
  const answered = look.answer('f1');
  await vi.runAllTimersAsync();
  await answered;

  expect(replyText(said)).toBe(relayWords.askFirst);
  expect(taken()).toBe(0);
});

it('counts the person’s words that arrive just after the voice asked for the picture', async () => {
  const { look, said, taken } = lookWith();

  const answered = look.answer('f1');
  await vi.advanceTimersByTimeAsync(300);
  look.personSpoke();
  await answered;

  expect(replyText(said)).toBe(relayWords.looked);
  expect(taken()).toBe(1);
});

it('stops waiting for late words and asks the person first', async () => {
  const { look, said, taken } = lookWith();

  const answered = look.answer('f1');
  await vi.runAllTimersAsync();
  await answered;

  expect(replyText(said)).toBe(relayWords.askFirst);
  expect(taken()).toBe(0);
});
