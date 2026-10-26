import { describe, expect, it } from 'vitest';
import { type ListLookInput, resolveListLook } from './list-look';

const phones = ['ios', 'android'] satisfies ListLookInput['platform'][];

const look = (
  input: Partial<ListLookInput>,
): ReturnType<typeof resolveListLook> =>
  resolveListLook({
    appearance: 'plain',
    platform: 'web',
    menu: false,
    sidebar: false,
    ...input,
  });

describe('onPhones', () => {
  const onPhones = { appearance: 'cards', padding: 0 } as const;

  it('draws what the phones declare, and the web its own appearance', () => {
    for (const platform of phones)
      expect(look({ appearance: 'plain', onPhones, platform }).appearance).toBe(
        'cards',
      );

    expect(look({ appearance: 'plain', onPhones }).appearance).toBe('plain');
  });

  it('holds the phones side padding for them only', () => {
    expect(look({ onPhones, platform: 'ios' }).phonePadding).toBe(0);
    expect(look({ onPhones, platform: 'android' }).phonePadding).toBe(0);
    expect(look({ onPhones }).phonePadding).toBeUndefined();
  });
});
