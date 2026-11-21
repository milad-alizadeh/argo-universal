import type { ShellTerminal } from '@repo/contracts';
import {
  useSheet,
  type SheetDestination,
} from '@repo/kit/primitives/overlays/sheet';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { createContext, use, useState, type ReactElement } from 'react';
import { ShellTerminalInspector, type SessionRuns } from '#features/sessions';
import { shellTabKey } from './sections/runs-section';

export const WorkbenchShellRuntime = createContext<SessionRuns | undefined>(
  undefined,
);

export function workbenchShellPage(shell: ShellTerminal): SheetDestination {
  return {
    name: shellTabKey(shell.id),
    title: shell.name,
    keepsHeaderInset: true,
    children: <WorkbenchShellTerminal shell={shell} />,
  };
}

function WorkbenchShellTerminal({
  shell,
}: {
  shell: ShellTerminal;
}): ReactElement {
  const runs = use(WorkbenchShellRuntime);
  const { back } = useSheet();
  const listed = runs?.shells?.some(({ id }) => id === shell.id);
  const [wasListed, setWasListed] = useState(false);

  // The open response can arrive before the Runs subscription lists the new shell.
  if (listed && !wasListed) setWasListed(true);

  if (!runs || (wasListed && !listed))
    return <EmptyState icon="terminal" title="This Terminal has closed" />;

  const close = (): void => {
    back();
    runs.closeShell?.(shell.id);
  };

  return (
    <ShellTerminalInspector shell={shell} onClose={close}>
      {runs.renderShell?.(shell, true, true)}
    </ShellTerminalInspector>
  );
}
