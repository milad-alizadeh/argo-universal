import { describe, expect, it } from 'vitest';
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
