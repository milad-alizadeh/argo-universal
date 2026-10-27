import { describe, expect, it } from 'vitest';
import { rowsAreCompact } from './list-look';
import { look, phones } from './list-look-fixtures';

describe('onPhones', () => {
  const onPhones = { appearance: 'cards', padding: 0 } as const;

  it.each(phones)('draws what the phones declare on %s', (platform) => {
    expect(look({ appearance: 'plain', onPhones, platform }).appearance).toBe(
      'cards',
    );
  });

  it('draws the web its own appearance', () => {
    expect(look({ appearance: 'plain', onPhones }).appearance).toBe('plain');
  });

  it.each(phones)('holds the side padding for %s', (platform) => {
    expect(look({ onPhones, platform }).phonePadding).toBe(0);
  });

  it('holds no phone side padding on the web', () => {
    expect(look({ onPhones }).phonePadding).toBeUndefined();
  });
});

describe('density', () => {
  it('keeps a compact List compact on the web', () => {
    expect(look({ density: 'compact' }).density).toBe('compact');
  });

  it.each(phones)(
    'draws regular rows on %s whatever it declares',
    (platform) => {
      expect(look({ density: 'compact', platform }).density).toBe('regular');
    },
  );
});

describe('rowsAreCompact', () => {
  const place = { menu: false, wide: true, sidebar: false };

  it('draws a content List compact on a wide window only', () => {
    expect(rowsAreCompact('compact', place)).toBe(true);
    expect(rowsAreCompact('compact', { ...place, wide: false })).toBe(false);
  });

  it('keeps a sidebar List compact at every width', () => {
    expect(
      rowsAreCompact('compact', { ...place, wide: false, sidebar: true }),
    ).toBe(true);
  });

  it('draws a regular List regular, sidebar or not', () => {
    expect(rowsAreCompact('regular', { ...place, sidebar: true })).toBe(false);
  });

  it('never draws a popover compact', () => {
    expect(rowsAreCompact('compact', { ...place, menu: true })).toBe(false);
  });
});
