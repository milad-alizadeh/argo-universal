import { afterEach, describe, expect, it, vi } from 'vitest';
import { screenSightOffered as native } from './screen-sight-offered';
import { screenSightOffered as web } from './screen-sight-offered.web';

afterEach(() => vi.unstubAllGlobals());

describe('screenSightOffered', () => {
  it('is never offered on a phone', () => {
    expect(native()).toBe(false);
  });

  it('is not offered in a browser tab', () => {
    vi.stubGlobal('window', {});

    expect(web()).toBe(false);
  });

  it('is offered by the desktop App, whose preload can capture', () => {
    vi.stubGlobal('window', {
      argo: { links: { onOpen: () => 0 }, screen: {} },
    });

    expect(web()).toBe(true);
  });
});
