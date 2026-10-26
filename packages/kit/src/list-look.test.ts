import { describe, expect, it } from 'vitest';
import type { ListAppearance } from './list-context';
import { type ListLookInput, resolveListLook } from './list-look';

type Platform = ListLookInput['platform'];

const appearances = ['plain', 'grouped', 'cards'] satisfies ListAppearance[];

const phones = ['ios', 'android'] satisfies Platform[];

const look = (
  input: Partial<ListLookInput>,
): ReturnType<typeof resolveListLook> =>
  resolveListLook({
    appearance: 'cards',
    platform: 'web',
    menu: false,
    sidebar: false,
    ...input,
  });

describe('who draws the grouped section', () => {
  it.each(appearances)(
    'has %s drawn by the web as a card only if grouped',
    (appearance) => {
      expect(look({ appearance }).webGrouped).toBe(appearance === 'grouped');
    },
  );

  it.each(phones)(
    'has %s draw a grouped section as corners, and no other',
    (platform) => {
      expect(look({ appearance: 'grouped', platform }).phone).toBe(platform);
      expect(look({ appearance: 'plain', platform }).phone).toBeUndefined();
      expect(look({ appearance: 'cards', platform }).phone).toBeUndefined();
    },
  );

  it('draws a phone that is neither iOS nor Android as iOS', () => {
    expect(look({ appearance: 'grouped', platform: 'macos' }).phone).toBe(
      'ios',
    );
  });

  it('never has both the web and a phone draw it', () => {
    for (const platform of ['web', 'ios', 'android'] as const) {
      const resolved = look({ appearance: 'grouped', platform });

      expect(resolved.webGrouped).toBe(!resolved.phone);
    }
  });
});

describe('groupedOnPhones', () => {
  it('groups the phones and leaves the web its own appearance', () => {
    for (const platform of phones)
      expect(
        look({ appearance: 'cards', groupedOnPhones: true, platform }),
      ).toMatchObject({ appearance: 'grouped', phone: platform });

    expect(look({ appearance: 'cards', groupedOnPhones: true })).toMatchObject({
      appearance: 'cards',
      webGrouped: false,
    });
  });

  it('draws the same as a List that declares grouped, on a phone', () => {
    expect(
      look({ appearance: 'cards', groupedOnPhones: true, platform: 'ios' }),
    ).toEqual(look({ appearance: 'grouped', platform: 'ios' }));
  });
});

describe('separators', () => {
  it('separate rows on iOS unless they are cards', () => {
    expect(look({ appearance: 'plain', platform: 'ios' }).separated).toBe(true);
    expect(look({ appearance: 'grouped', platform: 'ios' }).separated).toBe(
      true,
    );
    expect(look({ appearance: 'cards', platform: 'ios' }).separated).toBe(
      false,
    );
  });

  it('are never drawn by the web or Android', () => {
    for (const platform of ['web', 'android'] as const)
      for (const appearance of appearances)
        expect(look({ appearance, platform }).separated).toBe(false);
  });

  it('close a group with a row description on iOS only', () => {
    expect(look({ platform: 'ios' }).footerEndsGroup).toBe(true);
    expect(look({ platform: 'android' }).footerEndsGroup).toBe(false);
    expect(look({ platform: 'web' }).footerEndsGroup).toBe(false);
  });
});

describe('insets', () => {
  it('leave a plain List to its caller', () => {
    expect(look({ appearance: 'plain' }).insets).toEqual({});
  });

  it('give a popover the same insets whatever it holds', () => {
    const menu = look({ menu: true, appearance: 'plain' }).insets;

    for (const appearance of appearances)
      for (const platform of ['web', 'ios'] as const)
        expect(look({ menu: true, appearance, platform }).insets).toEqual(menu);
  });

  it('gives a wide phone List a page margin only when it fits its content', () => {
    const fitted = look({ appearance: 'grouped', platform: 'ios', fit: true });
    const filling = look({ appearance: 'grouped', platform: 'ios' });

    expect(fitted.insets.paddingTop).toEqual(filling.insets.paddingTop);
    expect(fitted.insets.padding).not.toEqual(filling.insets.padding);
  });

  it('gives a phone and the web different grouped insets', () => {
    expect(look({ appearance: 'grouped', platform: 'ios' }).insets).not.toEqual(
      look({ appearance: 'grouped' }).insets,
    );
  });

  it('holds cards the same on every platform', () => {
    const cards = look({ appearance: 'cards' }).insets;

    for (const platform of phones)
      expect(look({ appearance: 'cards', platform }).insets).toEqual(cards);
  });
});

describe('headings and footers', () => {
  it('start a web card on its rows text and no other look', () => {
    const none = { heading: '', footer: '' };

    expect(look({ appearance: 'grouped' }).edges).not.toEqual(none);
    expect(look({ appearance: 'grouped', platform: 'ios' }).edges).toEqual(
      none,
    );
    expect(look({ appearance: 'plain' }).edges).toEqual(none);
  });

  it('draw a phone grouped List on the grouped grey, apart from the web', () => {
    const phone = look({ appearance: 'grouped', platform: 'android' });

    expect(phone.section).not.toBe(look({ appearance: 'grouped' }).section);
    expect(look({ appearance: 'cards', platform: 'android' }).section).toBe(
      look({ appearance: 'plain' }).section,
    );
  });

  it('draw a sidebar the same however it is grouped', () => {
    const sidebar = look({ sidebar: true }).section;

    for (const appearance of appearances)
      expect(look({ sidebar: true, appearance }).choosingSection).toBe(sidebar);
  });

  it('give a choosing popover its own heading and others none', () => {
    const popover = look({ menu: true, appearance: 'plain' });

    expect(popover.choosingSection).not.toBe(popover.section);
    expect(look({ appearance: 'plain' }).choosingSection).toBe(
      look({ appearance: 'plain' }).section,
    );
  });
});
