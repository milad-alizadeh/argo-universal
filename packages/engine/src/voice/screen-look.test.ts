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

  const look = new ScreenLook(sessions, { sessionId: 's1' }, (say) =>
    said.push(say),
  );

  look.answered(true);

  return { look, said, taken: () => takes };
}

const person = (look: ScreenLook): void =>
  look.hear({ type: 'person.transcript', id: 'p', text: 'Look', final: true });

const voice = (look: ScreenLook): void =>
  look.hear({ type: 'voice.transcript', id: 'v', text: 'May I?', final: true });

const frame = (look: ScreenLook): void =>
  look.hear({ type: 'frame.requested', requestId: 'f1' });

const replyText = (said: VoiceSay[]): string | undefined =>
  said.find((say) => say.kind === 'reply')?.text;

it('refuses an ask the person made long before the voice requested the picture', async () => {
  const { look, said, taken } = lookWith();

  person(look);
  await vi.advanceTimersByTimeAsync(60_000);
  frame(look);
  await vi.runAllTimersAsync();

  expect(replyText(said)).toBe(relayWords.askFirst);
  expect(taken()).toBe(0);
});

it('counts the person’s words that arrive just after the voice asked for the picture', async () => {
  const { look, said, taken } = lookWith();

  frame(look);
  await vi.advanceTimersByTimeAsync(300);
  person(look);
  await vi.advanceTimersByTimeAsync(0);

  expect(replyText(said)).toBe(relayWords.looked);
  expect(taken()).toBe(1);
});

it('stops waiting for late words and asks the person first', async () => {
  const { look, said, taken } = lookWith();

  frame(look);
  await vi.runAllTimersAsync();

  expect(replyText(said)).toBe(relayWords.askFirst);
  expect(taken()).toBe(0);
});

it('says nothing can be captured when the provider’s call cannot look', async () => {
  const { look, said, taken } = lookWith();
  look.answered(false);

  person(look);
  frame(look);
  await vi.runAllTimersAsync();

  expect(replyText(said)).toBe(relayWords.noImages);
  expect(taken()).toBe(0);
});

it('asks again after the voice speaks, even if the person had spoken before', async () => {
  const { look, said, taken } = lookWith();

  person(look);
  voice(look);
  frame(look);
  await vi.runAllTimersAsync();

  expect(replyText(said)).toBe(relayWords.askFirst);
  expect(taken()).toBe(0);
});
