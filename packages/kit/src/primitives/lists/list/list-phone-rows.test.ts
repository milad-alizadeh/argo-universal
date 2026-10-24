import { createElement, Fragment, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { hostsNatively, type NativeKinds } from './list-phone-rows';
import type { ListProps } from './list-props';

const Section = (): null => null;

const Row = (): null => null;

const Other = (): null => null;

const kinds: NativeKinds = { section: Section, rows: new Set<unknown>([Row]) };

const row = (key: string): ReactElement => createElement(Row, { key });

const hosts = (
  props: Pick<
    ListProps<string>,
    'items' | 'header' | 'endContent' | 'children'
  >,
): boolean => hostsNatively(props, kinds);

describe('hostsNatively', () => {
  it('hosts rows, loose or in plain Sections, and sees through Fragments', () => {
    expect(hosts({ children: [row('a'), row('b')] })).toBe(true);
    expect(
      hosts({
        children: createElement(Section, { title: 'T', footer: 'F' }, row('a')),
      }),
    ).toBe(true);
    expect(
      hosts({ children: createElement(Fragment, null, row('a'), row('b')) }),
    ).toBe(true);
  });

  it('sends a row of any other kind to LegendList', () => {
    expect(
      hosts({ children: [row('a'), createElement(Other, { key: 'o' })] }),
    ).toBe(false);
    expect(
      hosts({ children: createElement(Section, null, createElement(Other)) }),
    ).toBe(false);
    expect(hosts({ children: ['text'] })).toBe(false);
  });

  it('sends a Section with props the native list does not draw to LegendList', () => {
    for (const extra of [
      { actions: [] },
      { collapsible: true },
      { leading: 'x' },
    ]) {
      expect(
        hosts({
          children: createElement(Section, { title: 'T', ...extra }, row('a')),
        }),
      ).toBe(false);
    }
  });

  it('sends a data List, and a List with a header or end content, to LegendList', () => {
    expect(hosts({ items: ['a'] })).toBe(false);
    expect(hosts({ header: 'h', children: row('a') })).toBe(false);
    expect(hosts({ endContent: 'e', children: row('a') })).toBe(false);
  });
});
