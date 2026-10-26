import { describe, expect, it } from 'vitest';
import { phonesGrouped } from './list-look';
import {
  appearances,
  look,
  phones,
  platforms,
  platformsAndAppearances,
} from './list-look-fixtures';

describe('who draws the grouped section', () => {
  it.each(appearances)(
    'has %s drawn by the web as a card only if grouped',
    (appearance) => {
      expect(look({ appearance }).webGrouped).toBe(appearance === 'grouped');
    },
  );

  it.each(phones)('has %s draw a grouped section as corners', (platform) => {
    expect(look({ appearance: 'grouped', platform }).phone).toBe(platform);
  });

  it.each(
    phones.flatMap((platform) => [
      [platform, 'plain'] as const,
      [platform, 'cards'] as const,
    ]),
  )('has %s draw a %s section without corners', (platform, appearance) => {
    expect(look({ appearance, platform }).phone).toBeUndefined();
  });

  it('draws a phone that is neither iOS nor Android as iOS', () => {
    expect(look({ appearance: 'grouped', platform: 'macos' }).phone).toBe(
      'ios',
    );
  });

  it.each(platforms)(
    'never has both the web and a phone draw it on %s',
    (platform) => {
      const resolved = look({ appearance: 'grouped', platform });

      expect(resolved.webGrouped).toBe(!resolved.phone);
    },
  );
});

describe('onPhones', () => {
  it.each(phones)('groups a List of cards on %s', (platform) => {
    expect(
      look({ appearance: 'cards', onPhones: phonesGrouped, platform }),
    ).toMatchObject({ appearance: 'grouped', phone: platform });
  });

  it('leaves the web its own appearance', () => {
    expect(
      look({ appearance: 'cards', onPhones: phonesGrouped }),
    ).toMatchObject({ appearance: 'cards', webGrouped: false });
  });

  it('draws the same as a List that declares grouped, on a phone', () => {
    const declaresGrouped = look({ appearance: 'grouped', platform: 'ios' });

    expect(
      look({ appearance: 'cards', onPhones: phonesGrouped, platform: 'ios' }),
    ).toEqual(declaresGrouped);
  });
});

describe('separators', () => {
  it.each([
    ['plain', true],
    ['grouped', true],
    ['cards', false],
  ] as const)('on iOS, %s rows are separated: %s', (appearance, separated) => {
    expect(look({ appearance, platform: 'ios' }).separated).toBe(separated);
  });

  it.each(platformsAndAppearances.filter(([platform]) => platform !== 'ios'))(
    'are never drawn by %s for %s rows',
    (platform, appearance) => {
      expect(look({ appearance, platform }).separated).toBe(false);
    },
  );

  it.each([
    ['ios', true],
    ['android', false],
    ['web', false],
  ] as const)(
    'close a group with a row description on %s: %s',
    (platform, closes) => {
      expect(look({ platform }).footerEndsGroup).toBe(closes);
    },
  );
});
