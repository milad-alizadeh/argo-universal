import type { ReactNode } from 'react';
import type { ComposerProps } from './composer-types';

// What a call here draws along the card's top edge, if anything.
export const edgeOf = ({ conversation }: Pick<ComposerProps, 'conversation'>): ReactNode =>
  conversation && 'edge' in conversation ? conversation.edge : null;
