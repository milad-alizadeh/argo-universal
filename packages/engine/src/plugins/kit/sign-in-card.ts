import type { ReactElement } from 'react';
import { jsx } from './jsx-runtime';

export type Pressed = Parameters<typeof jsx>[1][string];

// What one step of the sign-in says and does: a header beside the Plugin's mark, then Settings rows.
export type Card = {
  title: string;
  line?: string;
  code?: string;
  rows?: ReactElement[];
  footer?: string;
  signedIn?: boolean;
};

// Spacing steps of the kit's scale: under the header, beside the mark, and inside the code card.
const partGap = 6;

const headerGap = 4;

const codePadding = 4;

const markSize = 48;

const markRadius = 14;

const initialSize = 22;

const initialBaseline = 31;

const text = (role: string, content: string, tone?: string): ReactElement =>
  jsx('Text', { role, children: content, ...(tone && { tone }) });

// A row that does something, as Settings draws Sign out: no chevron, a button to assistive technology.
export const actionRow = (title: string, onPress: Pressed): ReactElement =>
  jsx('FieldGroup.Link', { title, action: true, onPress });

export const valueRow = (title: string, value: string): ReactElement =>
  jsx('FieldGroup.Value', { title, value });

type Layout = {
  direction: 'row' | 'column';
  gap: number;
  align: 'start' | 'center' | 'stretch';
};

const stack = (layout: Layout, children: ReactElement[]): ReactElement =>
  jsx('Stack', { ...layout, children });

const firstLetter = (name: string): string => {
  const point = name.codePointAt(0);

  return point === undefined ? '' : String.fromCodePoint(point);
};

// A name's first letter, as it can sit in markup: whole even when it is an emoji, and never markup itself.
const initialOf = (name: string): string =>
  firstLetter(name)
    .toUpperCase()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

// The Plugin's mark: its initial on a rounded tile, until a Plugin supplies its own artwork.
const markXml = (initial: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${markSize} ${markSize}"><rect x="0.5" y="0.5" width="${markSize - 1}" height="${markSize - 1}" rx="${markRadius}" fill="none" stroke="currentColor" stroke-opacity="0.25"/><text x="${markSize / 2}" y="${initialBaseline}" text-anchor="middle" font-size="${initialSize}" font-weight="600" fill="currentColor">${initial}</text></svg>`;

const mark = (name: string, signedIn: boolean): ReactElement =>
  jsx('Svg', {
    xml: markXml(initialOf(name)),
    label: name,
    tone: signedIn ? 'success' : 'info',
    width: markSize,
    aspectRatio: 1,
  });

const lineOf = ({ line }: Card): ReactElement[] =>
  line ? [text('secondary', line, 'muted')] : [];

const titles = (step: Card): ReactElement =>
  stack({ direction: 'column', gap: 0, align: 'start' }, [
    text('heading', step.title),
    ...lineOf(step),
  ]);

// The mark beside what this step is; the Screen's title already names the Plugin, so the header never repeats it.
const header = (name: string, step: Card): ReactElement =>
  stack({ direction: 'row', gap: headerGap, align: 'center' }, [
    mark(name, step.signedIn === true),
    titles(step),
  ]);

const copyButton = (code: string): ReactElement =>
  jsx('Button', {
    label: 'Copy',
    variant: 'text',
    onPress: { action: 'copy', text: code },
  });

// The device flow's code, with its own Copy at the end, as Settings draws a value someone takes away.
const codeSurface = (code: string): ReactElement =>
  jsx('Surface', {
    kind: 'card',
    padding: codePadding,
    children: stack({ direction: 'row', gap: 0, align: 'center' }, [
      text('title-code', code),
      jsx('Spacer', {}),
      copyButton(code),
    ]),
  });

const codeCard = ({ code }: Card): ReactElement[] =>
  code ? [codeSurface(code)] : [];

const fieldGroup = (rows: ReactElement[], footer?: string): ReactElement =>
  jsx('FieldGroup', {
    children: jsx('FieldGroup.Section', {
      ...(footer && { footer }),
      children: rows,
    }),
  });

const footerOnly = (footer: string | undefined): ReactElement[] =>
  footer ? [text('secondary', footer, 'muted')] : [];

const rowsOf = ({ rows = [], footer }: Card): ReactElement[] =>
  rows.length ? [fieldGroup(rows, footer)] : [];

// A step with no rows keeps its footer under the header, at the header's spacing.
const looseFooter = ({ rows = [], footer }: Card): ReactElement[] =>
  rows.length ? [] : footerOnly(footer);

/*
 * One sign-in page for every Plugin, laid out as Settings is: the step beside the mark, then its rows. The header
 * and the code are one part of the Screen and the rows another, so each keeps to the page's column.
 */
export const cardParts = (name: string, step: Card): ReactElement[] => [
  stack({ direction: 'column', gap: partGap, align: 'stretch' }, [
    header(name, step),
    ...codeCard(step),
    ...looseFooter(step),
  ]),
  ...rowsOf(step),
];
