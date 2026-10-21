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
  inspector,
  pageTitle,
  children,
}: InspectorSheetFrameProps): ReactElement {
  return (
    <Sheet {...sheetProps(inspector)}>
      <Sheet.Page name="inspector" title={pageTitle}>
        {children}
      </Sheet.Page>
    </Sheet>
  );
}

const sheetProps = ({
  open,
  onOpenChange,
  title,
  sheetHeader,
}: InspectorProps): Omit<React.ComponentProps<typeof Sheet>, 'children'> => ({
  open,
  onOpenChange,
  label: title,
  detents: sheetDetents,
  floating: sheetHeader !== undefined,
  contentScrolls: true,
});

const sheetDetents: ('medium' | 'large')[] = ['medium', 'large'];
