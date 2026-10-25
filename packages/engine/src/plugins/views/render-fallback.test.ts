import { expect, it, vi } from 'vitest';
import {
  fallbackKey,
  forgetOnce,
  logFallback,
  logOnce,
  updateArgoKey,
} from './render-fallback';

it('writes a line once per key and again after its Plugin is forgotten', () => {
  const log = vi.fn<(line: string) => void>();
  const key = fallbackKey('hook', 'counter', 'argo/composer/above/v1');

  logOnce(log, key, 'first');
  logOnce(log, key, 'second, same Slot');
  forgetOnce(log, 'counter');
  logOnce(log, key, 'third, after the Plugin was forgotten');

  expect(log.mock.calls.flat()).toEqual([
    'first',
    'Plugin counter: 1 more repeats of core-fallback hook argo/composer/above/v1',
    'third, after the Plugin was forgotten',
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

  logFallback(log, 'contribution', ['a', slot, 'boom']);
  logFallback(log, 'contribution', ['a', slot, 'boom']);
  logFallback(log, 'contribution', ['a', slot, 'bang']);

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
