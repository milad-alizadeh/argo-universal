import { EventEmitter } from 'node:events';
import type { PluginSurface } from '@repo/contracts/plugins/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRpcContext } from './connection';

afterEach(() => vi.restoreAllMocks());

const unconnectedSocket = (): EventEmitter => new EventEmitter();

const surfaceOf = (
  params: Record<string, string | undefined> | null,
): PluginSurface | undefined =>
  createRpcContext(unconnectedSocket(), params).connection?.surface;

describe('the Plugin surface an App reports on its Connection', () => {
  it('is read when it is recognised', () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});
    const surface = { platform: 'ios', wireVersion: 2 };

    expect(surfaceOf({ pluginSurface: JSON.stringify(surface) })).toEqual(
      surface,
    );
    expect(diagnostic).not.toHaveBeenCalled();
  });

  it.each([
    ['no params', null],
    ['no header', {}],
    ['an empty header', { pluginSurface: '' }],
  ])('is absent without a report when the App sends %s', (_name, params) => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(surfaceOf(params)).toBeUndefined();
    expect(diagnostic).not.toHaveBeenCalled();
  });

  it.each([
    ['not JSON', 'ios'],
    ['an unknown platform', '{"platform":"tv","wireVersion":2}'],
    ['a missing wire version', '{"platform":"ios"}'],
    ['not an object', 'null'],
  ])('is absent and reported when the header is %s', (_name, pluginSurface) => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(surfaceOf({ pluginSurface })).toBeUndefined();
    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(diagnostic).toHaveBeenCalledWith(
      expect.stringMatching(/^Plugin surface header: .+ surface #\d+$/),
      expect.anything(),
    );
  });
});
