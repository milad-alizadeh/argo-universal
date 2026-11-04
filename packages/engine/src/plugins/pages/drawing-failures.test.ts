import { expect, it, vi } from 'vitest';
import { DrawingFailures } from './drawing-failures';
import { forApp } from './wire-minimum';

const forged = '/page\nPlugin counter: stopped';

const at = { path: forged, pageState: {}, pages: 1 };

it('logs a failing page on one line whatever path the App asked for', () => {
  const log = vi.fn<(line: string) => void>();
  const failures = new DrawingFailures(
    { failed: () => true, clearDrawing: () => undefined },
    log,
  );

  failures.threw({ pluginId: 'counter', at }, 'it threw');

  expect(log.mock.calls.flat()).toEqual([
    'Plugin counter: could not draw /page Plugin counter: stopped: it threw',
  ]);
});

it('logs an App below the wire minimum on one line whatever path it asked for', () => {
  const log = vi.fn<(line: string) => void>();

  forApp(
    {
      pluginId: 'counter',
      at: { ...at, surface: { platform: 'web', wireVersion: 1 } },
      log,
    },
    {
      ok: true,
      root: { key: 'root', type: 'Text', props: {}, children: [] },
      pages: 0,
    },
  );

  expect(log.mock.calls.flat().join('')).not.toContain('\n');
});
