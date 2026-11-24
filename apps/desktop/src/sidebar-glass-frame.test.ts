import { expect, test, vi } from 'vitest';
import { createSidebarGlassReporter } from './sidebar-glass-frame';

test('reports a sidebar frame only when its native bounds change', (): void => {
  const send = vi.fn<Parameters<typeof createSidebarGlassReporter>[0]>();
  const report = createSidebarGlassReporter(send);
  const rect = { left: 8, top: 0, width: 280, height: 704, bottom: 704 };

  report(rect, 700, 1.25);
  report({ ...rect }, 700, 1.25);
  report({ ...rect, width: 300 }, 700, 1.25);
  report({ ...rect, width: 0 }, 700, 1.25);
  report(undefined, 700, 1.25);
  report({ ...rect, height: 0 }, 700, 1.25);

  expect(send.mock.calls).toEqual([
    [{ x: 10, top: 0, width: 350, bottom: 0 }],
    [{ x: 10, top: 0, width: 375, bottom: 0 }],
    [{ x: 0, top: 0, width: 0, bottom: 0 }],
  ]);
});
