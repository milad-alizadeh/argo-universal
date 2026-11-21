import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestPhoneSpeakerRoute } from './phone-speaker-route';

describe('iPhone Conversation speaker routing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets the audio mode exactly once', () => {
    const apply = vi.fn<() => void>();
    requestPhoneSpeakerRoute(apply);

    expect(apply).not.toHaveBeenCalled();
    vi.runAllTimers();

    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('cancels the pending route request when playback ends', () => {
    const apply = vi.fn<() => void>();
    const stop = requestPhoneSpeakerRoute(apply);
    stop();

    vi.runAllTimers();

    expect(apply).not.toHaveBeenCalled();
  });

  it('aborts the route request if playback ends during audio setup', () => {
    const apply = vi.fn<(signal: AbortSignal) => void>();
    const stop = requestPhoneSpeakerRoute(apply);

    vi.runAllTimers();
    stop();

    expect(apply.mock.calls[0]?.[0].aborted).toBe(true);
  });
});
