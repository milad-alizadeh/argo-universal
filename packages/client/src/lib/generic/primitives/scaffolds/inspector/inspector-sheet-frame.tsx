import type { ReactElement, ReactNode } from 'react';
import { Sheet } from '#primitives/overlays/sheet';
import type { InspectorProps } from './inspector-props';

interface InspectorSheetFrameProps {
  inspector: InspectorProps;
  // The sheet page's own header title, where the platform's sheet draws one.
  pageTitle?: string;
  children: ReactNode;
}

// The Inspector's sheet, at its medium detent first, with one page for its content; a page there can push more.
export function InspectorSheetFrame({
  inspector: { open, onOpenChange, title },
  pageTitle,
  children,
}: InspectorSheetFrameProps): ReactElement {
  return (
    <Sheet {...{ open, onOpenChange }} label={title} detents={sheetDetents}>
      <Sheet.Page name="inspector" title={pageTitle}>
        {children}
      </Sheet.Page>
    </Sheet>
  );
}

const sheetDetents: ('medium' | 'large')[] = ['medium', 'large'];
