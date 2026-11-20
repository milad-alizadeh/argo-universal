import { SizeClass } from '@repo/kit/size-class/size-class';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import type { SessionInspectorContent } from './session-inspector-content';
import { SessionWorkbenchSheet } from './session-workbench-sheet';

interface WorkbenchPresentation {
  open: () => void;
  sheet: ReactNode;
}

export function useSessionWorkbench(
  content: SessionInspectorContent,
): WorkbenchPresentation {
  const focused = useScreenFocused();
  const [open, setOpen] = useState(false);

  if (open && !focused) setOpen(false);

  return {
    open: (): void => setOpen(true),
    sheet: compactSheet({
      content,
      open: shown(open, focused),
      onOpenChange: setOpen,
    }),
  };
}

const shown = (open: boolean, focused: boolean): boolean => open && focused;

const compactSheet = (
  props: ComponentProps<typeof SessionWorkbenchSheet>,
): ReactNode => (
  <SizeClass only="compact">
    <SessionWorkbenchSheet {...props} />
  </SizeClass>
);
