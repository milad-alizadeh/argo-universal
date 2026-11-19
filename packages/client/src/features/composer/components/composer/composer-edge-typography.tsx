import { useTextStyle } from '@repo/kit/primitives/content/text';
import type { ReactElement, ReactNode } from 'react';
import { createContext, useContext } from 'react';
import { ScopedVariables } from 'uniwind';
import { roleVariables } from './composer-typography';

type Variables = Record<string, string | number>;

const EdgeVariables = createContext<Variables>({});

/*
 * The kit's Secondary size, read before the Composer sets every role to Body, for whatever runs along the card's top
 * edge. Its label is Badge-weight and its detail Secondary-weight, both at Secondary's size for the width.
 */
export function EdgeTypographySource({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const secondary = useTextStyle('secondary');
  const variables = roleVariables(secondary, ['secondary', 'badge']);

  return (
    <EdgeVariables.Provider value={variables}>
      {children}
    </EdgeVariables.Provider>
  );
}

// The card's top edge sets its type at the kit's Secondary size, as Paper's edge band does, not at the prompt's Body.
export function EdgeTypography({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <ScopedVariables variables={useContext(EdgeVariables)}>
      {children}
    </ScopedVariables>
  );
}
