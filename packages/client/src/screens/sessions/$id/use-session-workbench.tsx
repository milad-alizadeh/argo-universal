import type { ShellTerminal } from '@repo/contracts';
import { SizeClass } from '@repo/kit/size-class/size-class';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import type { SessionInspectorContent } from './session-inspector-content';
import { SessionWorkbenchSheet } from './session-workbench-sheet';

interface WorkbenchPresentation {
  open: () => void;
  openShell: (shell: ShellTerminal) => void;
  sheet: ReactNode;
}

export function useSessionWorkbench(
  content: SessionInspectorContent,
): WorkbenchPresentation {
  const focused = useScreenFocused();
  const [request, setRequest] = useState<{ shell?: ShellTerminal }>();

  if (request && !focused) setRequest(undefined);

  return {
    open: (): void => setRequest({}),
    openShell: (shell): void => setRequest({ shell }),
    sheet: compactSheet({
      content,
      open: focused && request !== undefined,
      initialShell: request?.shell,
      onOpenChange: (open) => setRequest(open ? {} : undefined),
    }),
  };
}

const compactSheet = (
  props: ComponentProps<typeof SessionWorkbenchSheet>,
): ReactNode => (
  <SizeClass only="compact">
    <SessionWorkbenchSheet {...props} />
  </SizeClass>
);
