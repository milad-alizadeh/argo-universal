import { expect, it, vi } from 'vitest';
import {
  fallbackKey,
  forgetOnce,
  logFallback,
  logOnce,
  type OnceKey,
} from './render-fallback';

const hookKey = fallbackKey('hook', 'counter', 'argo/composer/above/v1');

const updateArgoKey = (pluginId: string, path: string): OnceKey => [
  pluginId,
  'update-argo',
  path,
];

it('writes a line once per key', () => {
  const log = vi.fn<(line: string) => void>();

  logOnce(log, hookKey, 'first');
  logOnce(log, hookKey, 'second, same Slot');

  expect(log.mock.calls.flat()).toEqual(['first']);
});

it('writes a line again after its Plugin is forgotten', () => {
  const log = vi.fn<(line: string) => void>();

  logOnce(log, hookKey, 'first');
  forgetOnce(log, 'counter');
  logOnce(log, hookKey, 'third, after the Plugin was forgotten');

  expect(log.mock.calls.flat()).toEqual([
    'first',
    'third, after the Plugin was forgotten',
  ]);
});

it('writes the repeats held back as one line when its Plugin is forgotten', () => {
  const log = vi.fn<(line: string) => void>();

  logOnce(log, hookKey, 'first');
  logOnce(log, hookKey, 'second, same Slot');
  forgetOnce(log, 'counter');

  expect(log.mock.calls.flat()).toEqual([
    'first',
    'Plugin counter: 1 more repeats of core-fallback hook argo/composer/above/v1',
  ]);
});

it('keys on identity, so a Plugin changing its reason does not make a new line', () => {
  const log = vi.fn<(line: string) => void>();

  for (const reason of ['a', 'b', 'c'])
    logOnce(log, fallbackKey('drawing', 'counter', 'slot'), reason);

  expect(log).toHaveBeenCalledOnce();
});

it('logs a failing contribution once per Plugin, Slot id and reason', () => {
  const log = vi.fn<(line: string) => void>();
  const slot = 'argo/session/row/v1';

  logFallback(log, 'contribution', {
    pluginId: 'a',
    slotId: slot,
    reason: 'boom',
  });
  logFallback(log, 'contribution', {
    pluginId: 'a',
    slotId: slot,
    reason: 'boom',
  });
  logFallback(log, 'contribution', {
    pluginId: 'a',
    slotId: slot,
    reason: 'bang',
  });

  expect(log.mock.calls.flat()).toEqual([
    `Plugin a: core fallback ${slot}: boom`,
    `Plugin a: core fallback ${slot}: bang`,
  ]);
});

it('keeps Plugins, sources and logs apart', () => {
  const first = vi.fn<(line: string) => void>();
  const second = vi.fn<(line: string) => void>();

  logOnce(first, updateArgoKey('a', 'page'), 'a');
  logOnce(first, updateArgoKey('b', 'page'), 'b');
  logOnce(first, fallbackKey('hook', 'a', 'page'), 'hook');
  logOnce(first, fallbackKey('drawing', 'a', 'page'), 'drawing');
  logOnce(second, updateArgoKey('a', 'page'), 'other log');

  expect(first.mock.calls.flat()).toEqual(['a', 'b', 'hook', 'drawing']);
  expect(second).toHaveBeenCalledOnce();
});

it('says nothing when forgetting a Plugin that never repeated', () => {
  const log = vi.fn<(line: string) => void>();

  logOnce(log, updateArgoKey('a', 'page'), 'once');
  forgetOnce(log, 'a');

  expect(log).toHaveBeenCalledOnce();
});
