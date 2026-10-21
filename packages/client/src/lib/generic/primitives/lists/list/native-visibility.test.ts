import { afterEach, expect, it, vi } from 'vitest';
import { observeNativeVisibility } from './native-visibility';
import type { Bounds, ViewportNode } from './native-visibility-bounds';

afterEach(() => vi.unstubAllGlobals());

const emptyFrame: FrameRequestCallback = () => {};

const window = { left: 0, top: 0, right: 800, bottom: 1000 };

function host(
  bounds: Bounds,
  parentElement: ViewportNode | null = null,
): ViewportNode {
  return {
    tagName: 'RN:ScrollView',
    parentElement,
    getBoundingClientRect: () => bounds,
  };
}

it('reports visibility crossings and cancels polling after the last unsubscribe', () => {
  let frame = emptyFrame;

  vi.stubGlobal(
    'requestAnimationFrame',
    (callback: FrameRequestCallback): number => {
      frame = callback;

      return 1;
    },
  );
  const cancel = vi.fn<(id: number) => void>();
  vi.stubGlobal('cancelAnimationFrame', cancel);
  const panel = host({ left: 0, top: 200, right: 800, bottom: 400 });
  const bounds = { left: 0, top: 450, right: 800, bottom: 550 };
  const report = vi.fn<(visible: boolean) => void>();

  const stop = observeNativeVisibility({
    node: host(bounds, panel),
    window,
    report,
  });

  frame(0);
  expect(report).toHaveBeenLastCalledWith(false);
  bounds.top = 250;
  bounds.bottom = 350;
  frame(16);
  expect(report).toHaveBeenLastCalledWith(true);
  frame(32);
  expect(report).toHaveBeenCalledTimes(2);
  stop();
  expect(cancel).toHaveBeenCalledWith(1);
});

it('measures a shared scroll viewport once per frame for multiple shelves', () => {
  let frame = emptyFrame;

  vi.stubGlobal(
    'requestAnimationFrame',
    (callback: FrameRequestCallback): number => {
      frame = callback;

      return 1;
    },
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn<(id: number) => void>());
  const getBoundingClientRect = vi.fn<() => Bounds>(() => window);

  const panel = {
    tagName: 'RN:ScrollView',
    parentElement: null,
    getBoundingClientRect,
  };

  const stops = [100, 200].map((top) =>
    observeNativeVisibility({
      node: host({ left: 0, top, right: 800, bottom: top + 100 }, panel),
      window,
      report: vi.fn<(visible: boolean) => void>(),
    }),
  );

  frame(0);
  expect(getBoundingClientRect).toHaveBeenCalledTimes(1);
  frame(16);
  expect(getBoundingClientRect).toHaveBeenCalledTimes(2);

  for (const stop of stops) stop();
});
