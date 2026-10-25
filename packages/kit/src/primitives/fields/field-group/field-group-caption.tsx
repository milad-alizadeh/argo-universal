import type { ReactNode } from 'react';
import type { CaptionProps } from './field-group-caption-insets';

// Only Android draws a title or footer itself, as an item of its lazy column; iOS and the web hand them to Expo's Section.
export function Caption(_props: CaptionProps): ReactNode {
  return null;
}
