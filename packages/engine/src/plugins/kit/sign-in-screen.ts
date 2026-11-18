import type { ReactElement } from 'react';
import { jsx } from './jsx-runtime';
import { signIn } from './sign-in-card';
import { cardOf, type SignInParts } from './sign-in-cards';

export type { SignInParts } from './sign-in-cards';

const canOpenBrowser = ({ data }: SignInParts): boolean =>
  data.flow.kind === 'idle' && !data.needsServerDevice;

function browserSection(parts: SignInParts): ReactElement {
  const card = cardOf({ ...parts, data: { ...parts.data, rejected: null } });
  const { title, description, footer, rows } = card;
  const idle = canOpenBrowser(parts);

  const text = idle
    ? { title: 'Use your browser', footer }
    : { title, footer: [description, footer].filter(Boolean).join(' ') };

  const children = jsx('FieldGroup.Section', { ...text, children: rows });

  return jsx('FieldGroup', { children }, 'oauth');
}

const important = ({ data }: SignInParts): boolean =>
  data.flow.kind === 'signed-in';

const defaultSection = (
  sections: readonly SignInParts[],
): SignInParts | undefined =>
  sections.find(({ data }) => data.pastesToken) ?? sections[0];

function primaryOf(sections: readonly SignInParts[]): SignInParts {
  const preferred = defaultSection(sections);

  const main = sections.find(important) ?? preferred;

  if (!main) throw new Error('A sign-in page needs a flow');

  return main;
}

function content(
  main: SignInParts,
  sections: readonly SignInParts[],
): ReactElement | ReactElement[] {
  const primary = signIn(main, cardOf(main));
  const alternatives = sections.filter((section) => section !== main);

  if (main.data.flow.kind === 'signed-in' || alternatives.length === 0)
    return primary;

  return [primary, ...alternatives.map(browserSection)];
}

// A combined page shows the newest sign-in, or a section for each available flow.
export function signInScreen(
  parts: SignInParts | readonly SignInParts[],
): ReactElement {
  const sections = 'name' in parts ? [parts] : parts;
  const main = primaryOf(sections);

  return jsx('Screen', { title: main.name, children: content(main, sections) });
}
