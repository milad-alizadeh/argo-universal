import { setTimeout as delay } from 'node:timers/promises';
import {
  inspectProcess,
  ptySessionMembers,
  type PtySessionMember,
} from './pty-session-members';
import { releaseDeadlineMs, releasePollMs } from './timing';

export type PtySessionOwner = {
  pid: number;
  token: string;
  outputPath: string;
};

// The shell opens this descriptor read-only before it starts accepting input.
export const ptyOwnerDescriptor = 9;

const hasStatus = (error: Error, status: string | number): boolean =>
  'code' in error && error.code === status;

async function commandsOf(pid: number): Promise<string> {
  try {
    const { stdout } = await inspectProcess('/bin/ps', [
      '-ww',
      '-p',
      String(pid),
      '-o',
      'command=',
    ]);

    return stdout;
  } catch (error) {
    if (error instanceof Error && hasStatus(error, 1)) return '';
    throw error;
  }
}

async function holdsOwnerDescriptor(
  members: readonly PtySessionMember[],
  outputPath: string,
): Promise<boolean> {
  try {
    const command = process.platform === 'darwin' ? '/usr/sbin/lsof' : 'lsof';

    const { stdout } = await inspectProcess(command, [
      '-a',
      '-p',
      members.map(({ pid }) => pid).join(','),
      '-d',
      String(ptyOwnerDescriptor),
      '-Ff',
      '--',
      outputPath,
    ]);

    return stdout.split('\n').includes(`f${ptyOwnerDescriptor}`);
  } catch (error) {
    if (error instanceof Error && hasStatus(error, 1)) return false;
    throw error;
  }
}

async function requirePtyOwner(
  owner: PtySessionOwner,
  members: readonly PtySessionMember[],
): Promise<void> {
  const leader = members.find(({ pid }) => pid === owner.pid);
  const command = leader && (await commandsOf(leader.pid));

  if (command?.includes(owner.token)) return;

  // The old leader can be gone and its PID reused later, so confirm the surviving session against the original file.
  if (!command && (await holdsOwnerDescriptor(members, owner.outputPath)))
    return;

  throw new Error('PTY session identity changed');
}

function killGroups(members: readonly PtySessionMember[]): void {
  const groups = new Set(members.map(({ group }) => group));

  for (const group of groups) {
    try {
      process.kill(-group, 'SIGKILL');
    } catch (error) {
      if (!(error instanceof Error && hasStatus(error, 'ESRCH'))) throw error;
    }
  }
}

// Job control can create other groups inside a PTY session; a detached session is outside this Terminal.
export async function releasePtySession(owner: PtySessionOwner): Promise<void> {
  const deadline = Date.now() + releaseDeadlineMs;
  let members = await ptySessionMembers(owner.pid);

  while (members.length > 0) {
    if (Date.now() >= deadline) throw new Error('PTY session did not close');
    await requirePtyOwner(owner, members);
    killGroups(members);
    await delay(releasePollMs);

    members = await ptySessionMembers(owner.pid);
  }
}
