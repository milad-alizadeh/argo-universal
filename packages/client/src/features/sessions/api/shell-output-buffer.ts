import type { ShellOutput } from '@repo/contracts';

export interface ShellOutputBuffer {
  shellId: string;
  text: string;
  after: number;
}

const isForShell = (
  buffer: ShellOutputBuffer | null | undefined,
  shellId: string,
): buffer is ShellOutputBuffer => buffer?.shellId === shellId;

export function appendShellOutput(
  previous: ShellOutputBuffer | null,
  shellId: string,
  chunk: ShellOutput,
): ShellOutputBuffer {
  return {
    shellId,
    text: (isForShell(previous, shellId) ? previous.text : '') + chunk.text,
    after: chunk.after,
  };
}

export function newestShellOutput(
  visible: ShellOutputBuffer | undefined,
  received: ShellOutputBuffer,
): ShellOutputBuffer {
  if (!isForShell(visible, received.shellId)) return received;

  return received.after > visible.after ? received : visible;
}
