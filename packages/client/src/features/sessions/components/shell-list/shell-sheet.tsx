import { type JSX, useState } from 'react';
import {
  Sheet,
  type SheetPageAction,
  type SheetPageProps,
  type SheetProps,
  useSheet,
} from '#primitives/overlays/sheet';
import { ShellList, type ShellListProps } from './shell-list';
import type { ShellEntry, ShellOutputText } from './shell-list-types';
import { ShellOutput } from './shell-output';

export interface ShellSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shells: ShellEntry[];
  // The open Shell's output; the caller loads it when `onSelect` names the Shell.
  output?: ShellOutputText;
  onSelect?: (shell: ShellEntry) => void;
  onStop: (shell: ShellEntry) => void;
  now?: number;
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

function useOpenShell(
  props: ShellSheetProps,
): [ShellEntry | undefined, (shell: ShellEntry) => void] {
  const [openId, setOpenId] = useState<string>();
  const shell = props.shells.find((entry) => entry.id === openId);

  const open = (entry: ShellEntry): void => {
    setOpenId(entry.id);
    props.onSelect?.(entry);
  };

  return [shell, open];
}

type OutputPageProps = Pick<ShellSheetProps, 'output' | 'now'> & {
  shell: ShellEntry;
};

// Output loaded for another Shell is not yet this one's.
const ownOutput = ({
  output,
  shell,
}: OutputPageProps): ShellOutputText | undefined =>
  output?.shellId === shell.id ? output : undefined;

function OutputPage(
  props: Omit<OutputPageProps, 'shell'> & { shell?: ShellEntry },
): JSX.Element | null {
  const { shell } = props;

  if (!shell) return null;

  return (
    <ShellOutput
      shell={shell}
      output={ownOutput({ ...props, shell })}
      now={props.now}
    />
  );
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
