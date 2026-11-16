import type { ReactElement } from 'react';
import { jsx } from './jsx-runtime';

export type Pressed = Parameters<typeof jsx>[1][string];

// What one step of the card says and does, under the Plugin's mark.
export type Card = {
  title: string;
  lines?: string[];
  code?: string;
  actions?: ReactElement[];
  footnote?: string;
  signedIn?: boolean;
};

// Spacing steps of the kit's scale: between the card's parts, inside its heading and between its buttons.
const cardGap = 6;

const headingGap = 2;

const actionGap = 3;

const codePadding = 4;

const text = (role: string, content: string, tone?: string): ReactElement =>
  jsx('Text', { role, children: content, ...(tone && { tone }) });

export const button = (
  label: string,
  onPress: Pressed,
  variant: 'primary' | 'secondary' | 'text' = 'primary',
): ReactElement => jsx('Button', { label, onPress, variant, fullWidth: true });

const column = (
  children: ReactElement[],
  gap: number,
  align: 'center' | 'stretch' = 'center',
): ReactElement => jsx('Stack', { direction: 'column', align, gap, children });

const markSize = 64;

const markRadius = 18;

const initialSize = 28;

const initialBaseline = 42;

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
  column(
    [
      jsx('Svg', {
        xml: markXml(initialOf(name)),
        label: name,
        tone: signedIn ? 'success' : 'info',
        width: markSize,
        aspectRatio: 1,
      }),
    ],
    0,
  );

const heading = ({ title, lines = [] }: Card): ReactElement =>
  column(
    [
      text('title', title),
      ...lines.map((line) => text('secondary', line, 'muted')),
    ],
    headingGap,
  );

const codeBlock = ({ code }: Card): ReactElement[] =>
  code
    ? [
        jsx('Surface', {
          kind: 'card',
          padding: codePadding,
          children: column([text('title-code', code)], 0),
        }),
      ]
    : [];

const actionsOf = ({ actions = [] }: Card): ReactElement[] =>
  actions.length ? [column(actions, actionGap, 'stretch')] : [];

const footnoteOf = ({ footnote }: Card): ReactElement[] =>
  footnote ? [column([text('secondary', footnote, 'muted')], 0)] : [];

// The one centered card every step of every flow is drawn on: the mark, what is happening, and what to do next.
export const card = (name: string, step: Card): ReactElement =>
  column(
    [
      mark(name, step.signedIn === true),
      heading(step),
      ...codeBlock(step),
      ...actionsOf(step),
      ...footnoteOf(step),
    ],
    cardGap,
    'stretch',
  );
