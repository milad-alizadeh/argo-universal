import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WebFeedGlide } from './follow-web-feed';

const frame = 16;

beforeEach(() => {
  let elapsed = 0;
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (paint: FrameRequestCallback) =>
    setTimeout(() => {
      elapsed += frame;
      paint(elapsed);
    }, frame),
  );
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('preserves velocity when new measurements arrive before each frame', () => {
  const node = { clientHeight: 200, scrollHeight: 268, scrollTop: 0 };
  const glide = new WebFeedGlide(node);
  glide.start();
  vi.advanceTimersByTime(frame * 4);
  const previous = node.scrollTop;
  node.scrollHeight += 24;
  glide.start();
  vi.advanceTimersByTime(frame);
  expect(node.scrollTop - previous).toBeGreaterThan(3);
  expect(node.scrollTop - previous).toBeLessThan(8);
  vi.runAllTimers();
  expect(node.scrollTop).toBe(92);
});

it('releases the reader immediately when follow ends', () => {
  const node = { clientHeight: 200, scrollHeight: 268, scrollTop: 0 };
  const glide = new WebFeedGlide(node);
  glide.start();
  vi.advanceTimersByTime(frame * 4);
  glide.stop();
  node.scrollTop = 4;
  node.scrollHeight += 24;
  vi.runAllTimers();
  expect(node.scrollTop).toBe(4);
});

it('respects an explicit move to the end between frames', () => {
  const node = { clientHeight: 200, scrollHeight: 268, scrollTop: 0 };
  new WebFeedGlide(node).start();
  vi.advanceTimersByTime(frame * 4);
  node.scrollTop = 68;
  vi.advanceTimersByTime(frame);
  expect(node.scrollTop).toBe(68);
  expect(vi.getTimerCount()).toBe(0);
});
