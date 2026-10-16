import { expect, it, type Mock, vi } from 'vitest';
import { runAfterSignIn } from './session-sign-in';

interface EffectSpies {
  openAgain: Mock<() => void>;
  finish: Mock<(answered?: string) => void>;
}

const effects = (): EffectSpies => ({
  openAgain: vi.fn<() => void>(),
  finish: vi.fn<(answered?: string) => void>(),
});

it('answers the Turn a sign-in finished for, and opens nothing', () => {
  const spies = effects();

  runAfterSignIn({ type: 'answer-turn', turnEnd: 'end-1' }, spies);

  expect(spies.finish).toHaveBeenCalledWith('end-1');
  expect(spies.openAgain).not.toHaveBeenCalled();
});

it('opens a refused Session again and ends the sign-in, answering no Turn', () => {
  const spies = effects();

  runAfterSignIn({ type: 'open-again' }, spies);

  expect(spies.openAgain).toHaveBeenCalledOnce();
  expect(spies.finish).toHaveBeenCalledWith();
});
