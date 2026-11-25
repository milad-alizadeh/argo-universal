import { describe, expect, it } from 'vitest';
import { splitSectionHref, usesIPadSplitView } from './ipad-split-view';

describe('the native split view', () => {
  it.each([
    {
      device: 'iPadOS 26',
      platform: 'ios',
      pad: true,
      version: '26.0',
      expected: true,
    },
    {
      device: 'iPadOS 27',
      platform: 'ios',
      pad: true,
      version: '27.2',
      expected: true,
    },
    {
      device: 'iPadOS 18',
      platform: 'ios',
      pad: true,
      version: '18.7',
      expected: false,
    },
    {
      device: 'iPhone',
      platform: 'ios',
      pad: false,
      version: '27.2',
      expected: false,
    },
    {
      device: 'Android',
      platform: 'android',
      pad: false,
      version: 36,
      expected: false,
    },
    { device: 'web', platform: 'web', pad: false, version: 0, expected: false },
  ])(
    'sets split view availability on $device to $expected',
    ({ platform, pad, version, expected }) => {
      expect(usesIPadSplitView(platform, pad, version)).toBe(expected);
    },
  );
});

describe('the iPad sidebar section picker', () => {
  const choices = [
    { id: 'scheduled', href: '/scheduled' },
    { id: 'plugins/example/queue', href: '/plugins/example/queue/inbox' },
  ];

  it('opens a core section by its public route', () => {
    expect(splitSectionHref('sessions', 'scheduled', { choices })).toBe(
      '/scheduled',
    );
  });

  it('opens a Plugin section at its manifest path', () => {
    expect(
      splitSectionHref('sessions', 'plugins/example/queue', { choices }),
    ).toBe('/plugins/example/queue/inbox');
  });

  it('keeps the current page when reselecting a section', () => {
    expect(
      splitSectionHref('scheduled', 'scheduled', { choices }),
    ).toBeUndefined();
  });

  it('returns to the page last open in the chosen section', () => {
    const lastPages = new Map([['scheduled', '/scheduled/nightly']]);

    expect(
      splitSectionHref('sessions', 'scheduled', { choices, lastPages }),
    ).toBe('/scheduled/nightly');
  });

  it('ignores unavailable Plugin sections', () => {
    expect(
      splitSectionHref('sessions', 'plugins/example/removed', { choices }),
    ).toBeUndefined();
  });
});
