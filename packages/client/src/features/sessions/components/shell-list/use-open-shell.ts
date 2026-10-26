import { useEffect, useState } from 'react';
import type { ShellEntry, ShellViewProps } from './shell-list-types';

type OpenShell = [
  shell: ShellEntry | undefined,
  open: (shell: ShellEntry) => void,
  close: () => void,
];

// Which Shell's output the sheet or panel shows; opening one tells the caller to load its output.
export function useOpenShell(
  props: Pick<ShellViewProps, 'shells' | 'onSelect' | 'onDeselect'>,
): OpenShell {
  const [openId, setOpenId] = useState<string>();
  const shell = props.shells.find((entry) => entry.id === openId);
  const close = useDeselect(setOpenId, props.onDeselect);

  const open = (entry: ShellEntry): void => {
    setOpenId(entry.id);
    props.onSelect?.(entry);
  };

  return [shell, open, close];
}

function useDeselect(
  setOpenId: (id?: string) => void,
  onDeselect: ShellViewProps['onDeselect'],
): () => void {
  useEffect(() => onDeselect, [onDeselect]);

  return () => {
    setOpenId(undefined);
    onDeselect?.();
  };
}
