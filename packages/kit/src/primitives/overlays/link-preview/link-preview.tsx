import type { ReactElement } from 'react';
import type { LinkPreviewProps } from './link-preview-props';

// Phones keep their system link behaviour and never request preview data.
export function LinkPreview({ children }: LinkPreviewProps): ReactElement {
  return children;
}
