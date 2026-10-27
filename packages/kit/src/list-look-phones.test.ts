import { describe, expect, it } from 'vitest';
import { look, phones } from '../mocks/list-look-fixtures';

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

describe('compact rows', () => {
  const compact = { density: 'compact', wide: true } as const;

  it('draw a content List compact on a wide window only', () => {
    expect(look(compact).compact).toBe(true);
    expect(look({ ...compact, wide: false }).compact).toBe(false);
  });

  it('keep a sidebar List compact at every width', () => {
    expect(look({ ...compact, wide: false, place: 'sidebar' }).compact).toBe(
      true,
    );
  });

  it('draw a regular List regular, sidebar or not', () => {
    expect(
      look({ ...compact, density: 'regular', place: 'sidebar' }).compact,
    ).toBe(false);
  });

  it('never draw a popover compact', () => {
    expect(look({ ...compact, place: 'popover' }).compact).toBe(false);
    expect(look({ ...compact, place: 'popover' }).compactSidebarRows).toBe(
      false,
    );
  });

  it('lets a row ask for the sidebar drawing at any width', () => {
    expect(look({ ...compact, wide: false }).compactSidebarRows).toBe(true);
  });
});
