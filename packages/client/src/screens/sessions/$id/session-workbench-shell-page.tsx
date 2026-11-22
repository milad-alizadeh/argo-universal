import type { ShellTerminal } from '@repo/contracts';
import {
  useSheet,
  type SheetDestination,
} from '@repo/kit/primitives/overlays/sheet';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import { createContext, use, type ReactElement } from 'react';
import type { SessionRuns } from '#features/sessions';
import {
  endTerminalTab,
  shellTabKey,
  TerminalTabBody,
  useOpenedShellTab,
} from './session-terminal-tabs';

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
  const tab = useOpenedShellTab(runs, shell);

  if (!runs || !tab)
    return <EmptyState icon="terminal" title="This Terminal has closed" />;

  const close = (): void => {
    back();
    endTerminalTab(runs, tab);
  };

  return (
    <TerminalTabBody
      tab={tab}
      controls={runs}
      visible
      compact
      onClose={close}
    />
  );
}
