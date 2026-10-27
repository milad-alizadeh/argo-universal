import { describe, expect, it } from 'vitest';
import {
  appearances,
  look,
  phones,
  platformsAndAppearances,
} from '../mocks/list-look-fixtures';

const noEdges = { heading: '', footer: '' };

describe('insets', () => {
  it('leave a plain List to its caller', () => {
    expect(look({ appearance: 'plain' }).insets).toEqual({});
  });

  it.each(platformsAndAppearances)(
    'give a popover the same insets whatever it holds: %s, %s',
    (platform, appearance) => {
      const menu = look({ menu: true, appearance: 'plain' }).insets;

      expect(look({ menu: true, appearance, platform }).insets).toEqual(menu);
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
  it('start a web card on its rows text', () => {
    expect(look({ appearance: 'grouped' }).edges).not.toEqual(noEdges);
  });

  it('start a phone grouped List with no edge of its own', () => {
    expect(look({ appearance: 'grouped', platform: 'ios' }).edges).toEqual(
      noEdges,
    );
  });

  it('start a plain List with no edge of its own', () => {
    expect(look({ appearance: 'plain' }).edges).toEqual(noEdges);
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
      const sidebar = look({ sidebar: true }).section;

      expect(look({ sidebar: true, appearance }).choosingSection).toBe(sidebar);
    },
  );

  it('give a choosing popover its own heading', () => {
    const popover = look({ menu: true, appearance: 'plain' });

    expect(popover.choosingSection).not.toBe(popover.section);
  });

  it('give any other List the same heading when it chooses', () => {
    const plain = look({ appearance: 'plain' });

    expect(plain.choosingSection).toBe(plain.section);
  });
});
