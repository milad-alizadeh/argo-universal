import { useTextStyle } from '@repo/kit/primitives/content/text';
import type { ReactElement, ReactNode } from 'react';
import { ScopedVariables, useResolveClassNames } from 'uniwind';

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

// Prompt content follows Body; phone pills retain the compact Control metrics.
export function ComposerTypography({
  children,
  compact,
}: {
  children: ReactNode;
  compact?: boolean;
}): ReactElement {
  const variables = useComposerVariables(compact);

  return <ScopedVariables variables={variables}>{children}</ScopedVariables>;
}

function useComposerVariables(
  compact: boolean | undefined,
): Record<string, string | number> {
  const body = useTextStyle('body');
  const control = useResolveClassNames('text-sm leading-5');
  const roles = compact ? ['control', 'badge'] : composerRoles;

  return bodyVariables(compact ? control : body, roles);
}

type BodyStyle = Pick<
  ReturnType<typeof useTextStyle>,
  'fontSize' | 'lineHeight'
>;

function bodyVariables(
  { fontSize, lineHeight }: BodyStyle,
  roles: string[],
): Record<string, string | number> {
  if (fontSize === undefined || lineHeight === undefined) return {};

  return Object.fromEntries(
    roles.flatMap((role) => [
      [`--text-${role}`, fontSize],
      [`--text-${role}-wide`, fontSize],
      [`--leading-${role}`, lineHeight],
      [`--leading-${role}-wide`, lineHeight],
    ]),
  );
}
