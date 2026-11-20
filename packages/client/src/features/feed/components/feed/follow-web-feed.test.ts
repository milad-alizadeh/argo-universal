import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WebFeedGlide, WebFeedViewport } from './follow-web-feed';

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
  vi.advanceTimersByTime(frame * 3);
  const before = node.scrollTop;
  vi.advanceTimersByTime(frame);
  const previous = node.scrollTop;
  node.scrollHeight += 24;
  glide.start();
  vi.advanceTimersByTime(frame);
  expect(node.scrollTop - previous).toBeGreaterThan((previous - before) / 2);
  expect(node.scrollTop).toBeLessThan(92);
  vi.advanceTimersByTime(240);
  expect(92 - node.scrollTop).toBeLessThan(2);
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

it('keeps following when the queue tray disappears and the next row arrives in the same frame', () => {
  const viewport = new WebFeedViewport();
  expect(
    viewport.clamped({ offset: 18375, viewport: 646, content: 19021 }, true),
  ).toBe(false);
  expect(
    viewport.clamped({ offset: 18343, viewport: 678, content: 19053 }, false),
  ).toBe(true);
});

it('leaves a reader who scrolled away in place across the same resize', () => {
  const viewport = new WebFeedViewport();
  viewport.clamped({ offset: 18375, viewport: 646, content: 19021 }, true);
  viewport.clamped({ offset: 18310, viewport: 646, content: 19021 }, false);
  expect(
    viewport.clamped({ offset: 18310, viewport: 678, content: 19053 }, false),
  ).toBe(false);
});

it('remembers the bottom of a resized Feed even when the list skips its scroll event', () => {
  const viewport = new WebFeedViewport();
  viewport.clamped({ offset: 18343, viewport: 678, content: 19021 }, true);
  viewport.resized(
    { scrollTop: 18375, clientHeight: 646, scrollHeight: 19021 },
    true,
  );
  expect(
    viewport.resized(
      { scrollTop: 18343, clientHeight: 678, scrollHeight: 19053 },
      false,
    ),
  ).toBe(true);
});

it('recovers on layout when both tray scroll events are coalesced', () => {
  const viewport = new WebFeedViewport();
  viewport.clamped({ offset: 18343, viewport: 678, content: 19021 }, true);
  viewport.resized(
    { scrollTop: 18343, clientHeight: 646, scrollHeight: 19021 },
    true,
  );
  expect(
    viewport.resized(
      { scrollTop: 18343, clientHeight: 678, scrollHeight: 19053 },
      false,
    ),
  ).toBe(true);
});

it('writes the measured DOM end even when the list still reports that it follows', () => {
  const viewport = new WebFeedViewport();
  const node = { scrollTop: 18375, clientHeight: 646, scrollHeight: 19021 };
  viewport.sample(node, true);
  Object.assign(node, {
    scrollTop: 18343,
    clientHeight: 678,
    scrollHeight: 19053,
  });
  viewport.sample(node, true);
  expect(node.scrollTop).toBe(node.scrollHeight);
});
