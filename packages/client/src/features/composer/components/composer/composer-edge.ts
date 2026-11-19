import type { ReactNode } from 'react';
import type { ComposerProps } from './composer-types';

// What a call here draws along the card's top edge, if anything.
export const edgeOf = ({ voice }: Pick<ComposerProps, 'voice'>): ReactNode =>
  voice && 'edge' in voice ? voice.edge : null;
