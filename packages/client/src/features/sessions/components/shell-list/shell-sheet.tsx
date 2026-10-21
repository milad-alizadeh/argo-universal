import type { JSX } from 'react';
import {
  Sheet,
  type SheetPageAction,
  type SheetPageProps,
  type SheetProps,
  useSheet,
} from '#primitives/overlays/sheet';
import { ShellList } from './shell-list';
import type {
  ShellEntry,
  ShellListProps,
  ShellViewProps,
} from './shell-list-types';
import { ShellOutput } from './shell-output';
import { useOpenShell } from './use-open-shell';

export interface ShellSheetProps extends ShellViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// A running Shell the Server can stop offers Stop; an ended one offers nothing.
function stopAction(
  shell: ShellEntry,
  onStop: ShellSheetProps['onStop'],
): SheetPageAction | undefined {
  if (shell.status !== 'running' || !shell.canStop) return undefined;

  return { label: 'Stop', destructive: true, onPress: () => onStop(shell) };
}

// The list's rows push the Shell's output page within the same sheet.
function ShellRows(
  props: Pick<ShellListProps, 'shells' | 'now'> & {
    onOpen: (shell: ShellEntry) => void;
  },
): JSX.Element {
  const sheet = useSheet();

  const open = (shell: ShellEntry): void => {
    props.onOpen(shell);
    sheet.push('shell');
  };

  return <ShellList shells={props.shells} now={props.now} onSelect={open} />;
}

function OutputPage(
  props: Pick<ShellViewProps, 'output' | 'now'> & { shell?: ShellEntry },
): JSX.Element | null {
  const { shell } = props;

  if (!shell) return null;

  return <ShellOutput shell={shell} output={props.output} now={props.now} />;
}

// The output page's header: the command as its title, and Stop while the Shell runs.
function outputHeading(
  shell: ShellEntry | undefined,
  onStop: ShellSheetProps['onStop'],
): Pick<SheetPageProps, 'title' | 'action'> {
  return { title: shell?.command, action: shell && stopAction(shell, onStop) };
}

const sheetFrame = (
  props: ShellSheetProps,
): Pick<SheetProps, 'open' | 'onOpenChange' | 'label' | 'contentScrolls'> => ({
  open: props.open,
  onOpenChange: props.onOpenChange,
  label: 'Shells',
  contentScrolls: true,
});

// The Composer's Shells pill opens the Session's background Shells; a Shell's output is the sheet's second page.
export function ShellSheet(props: ShellSheetProps): JSX.Element {
  const [shell, openShell] = useOpenShell(props);

  return (
    <Sheet {...sheetFrame(props)}>
      <Sheet.Page name="shells" title="Shells">
        <ShellRows shells={props.shells} now={props.now} onOpen={openShell} />
      </Sheet.Page>
      <Sheet.Page name="shell" {...outputHeading(shell, props.onStop)}>
        <OutputPage shell={shell} output={props.output} now={props.now} />
      </Sheet.Page>
    </Sheet>
  );
}
