import { useTextStyle } from '@repo/kit/primitives/content/text';
import type { ReactElement, ReactNode } from 'react';
import { ScopedVariables } from 'uniwind';

const composerRoles = [
  'body',
  'title',
  'heading',
  'secondary',
  'control',
  'badge',
  'code',
  'code-inline',
  'nav-title',
  'nav-action',
  'row',
  'row-detail',
];

// Every Composer label follows Body, including controls and text rendered by the editor.
export function ComposerTypography({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const body = useTextStyle('body');

  return (
    <ScopedVariables variables={bodyVariables(body)}>
      {children}
    </ScopedVariables>
  );
}

type BodyStyle = Pick<
  ReturnType<typeof useTextStyle>,
  'fontSize' | 'lineHeight'
>;

function bodyVariables({
  fontSize,
  lineHeight,
}: BodyStyle): Record<string, string | number> {
  if (fontSize === undefined || lineHeight === undefined) return {};

  return Object.fromEntries(
    composerRoles.flatMap((role) => [
      [`--text-${role}`, fontSize],
      [`--text-${role}-wide`, fontSize],
      [`--leading-${role}`, lineHeight],
      [`--leading-${role}-wide`, lineHeight],
    ]),
  );
}
