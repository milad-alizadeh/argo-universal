import { rm } from 'node:fs/promises';
import { writeLog } from '@repo/machine-log';
import { releasePtySession } from '@repo/process/pty-session';
import {
  shellTerminalOutputFolder,
  shellTerminalOutputPath,
  terminalOwnerToken,
} from '../lib/terminal-owner';
import {
  forgetTerminalOwner,
  recordTerminalOwner,
  terminalOwners,
} from '../lib/terminal-owner-record';

export async function recordCheckoutTerminalOwner(
  home: string,
  pid: number,
  token: string,
): Promise<() => Promise<void>> {
  const path = await recordTerminalOwner(home, {
    pid,
    token,
    checkoutTerminal: true,
  });

  return () => forgetTerminalOwner(path);
}

export async function recoverShellTerminals(home: string): Promise<void> {
  for await (const { path, record } of terminalOwners(home)) {
    if (!record.checkoutTerminal) continue;

    await releasePtySession({
      pid: record.pid,
      token: terminalOwnerToken(record.token),
      outputPath: shellTerminalOutputPath(home, record.token),
    });
    writeLog({
      home,
      label: 'engine',
      line: `Shell Terminal ${record.token} marked lost after Engine exit`,
    });
    await forgetTerminalOwner(path);
  }

  // On Linux the recording is part of process ownership proof. Release owners before deleting recordings.
  await rm(shellTerminalOutputFolder(home), { recursive: true, force: true });
}
