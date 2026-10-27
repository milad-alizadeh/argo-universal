import { describe, expect, it } from 'vitest';
import {
  appearances,
  look,
  phones,
  platformsAndAppearances,
} from '../mocks/list-look-fixtures';
import { rowInset } from './list-look-insets';

describe('insets', () => {
  it('leave a plain List to its caller', () => {
    expect(look({ appearance: 'plain' }).insets).toEqual({});
  });

  it.each(platformsAndAppearances)(
    'give a popover the same insets whatever it holds: %s, %s',
    (platform, appearance) => {
      const menu = look({ place: 'popover', appearance: 'plain' }).insets;

      expect(look({ place: 'popover', appearance, platform }).insets).toEqual(
        menu,
      );
    },
  );

  it('give a wide phone List a page margin only when it fits its content', () => {
    const filling = look({ appearance: 'grouped', platform: 'ios' });

    const fitted = look({ appearance: 'grouped', platform: 'ios', fit: true });

    expect(fitted.insets.padding).not.toEqual(filling.insets.padding);
  });

  it('keep the same top space on a phone List whether it fits or fills', () => {
    const filling = look({ appearance: 'grouped', platform: 'ios' });

    const fitted = look({ appearance: 'grouped', platform: 'ios', fit: true });

    expect(fitted.insets.paddingTop).toEqual(filling.insets.paddingTop);
  });

  it('gives a phone and the web different grouped insets', () => {
    const web = look({ appearance: 'grouped' }).insets;

    expect(look({ appearance: 'grouped', platform: 'ios' }).insets).not.toEqual(
      web,
    );
  });

  it.each(phones)('holds cards on %s as it does on the web', (platform) => {
    const web = look({ appearance: 'cards' }).insets;

    expect(look({ appearance: 'cards', platform }).insets).toEqual(web);
  });
});

describe('headings and footers', () => {
  it('start a web card on its rows text, 16 in at every width', () => {
    const card = look({ appearance: 'grouped' }).section;

    expect(card.inset).toBe('px-4');
    expect(card.headingBelow).not.toBe('');
  });

  it('start a phone grouped List with no inset of a card of its own', () => {
    const phone = look({ appearance: 'grouped', platform: 'ios' }).section;

    expect(phone.inset).toBe(look({ appearance: 'plain' }).section.inset);
    expect(phone.headingBelow).toBe('');
  });

  it('draw a phone grouped List on the grouped grey, apart from the web', () => {
    const web = look({ appearance: 'grouped' }).section;

    expect(
      look({ appearance: 'grouped', platform: 'android' }).section,
    ).not.toBe(web);
  });

  it('draw phone cards as a plain List does', () => {
    const plain = look({ appearance: 'plain' }).section;

    expect(look({ appearance: 'cards', platform: 'android' }).section).toBe(
      plain,
    );
  });

  it.each(appearances)(
    'draw a sidebar the same when it is %s',
    (appearance) => {
      const sidebar = look({ place: 'sidebar' }).section;

      expect(look({ place: 'sidebar', appearance }).section).toBe(sidebar);
    },
  );

  it('give a choosing popover its own heading', () => {
    const popover = look({ place: 'popover', appearance: 'plain' });

    expect(look({ place: 'choice', appearance: 'plain' }).section).not.toBe(
      popover.section,
    );
  });
});

describe('the heading inset of a Screen over grouped cards', () => {
  it('is the rows inset on a narrow web window', () => {
    expect(look({ appearance: 'grouped', wide: false }).headingInset).toBe(
      rowInset,
    );
  });

  it.each([
    ['a wide web window', { wide: true }],
    ['a phone', { platform: 'ios' as const }],
    ['plain rows', { appearance: 'plain' as const }],
  ])('is none on %s', (_name, input) => {
    expect(look({ appearance: 'grouped', ...input }).headingInset).toBe(0);
  });
});
