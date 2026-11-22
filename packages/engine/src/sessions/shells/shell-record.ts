import {
  forgetTerminalOwner,
  terminalOwners,
} from '../../lib/terminal-owner-record';
import { hasGroupOwner, hasLiveGroupMembers } from './shell-group-members';
import { releaseShellGroup } from './shell-process-group';

export async function releaseShellGroups(home: string): Promise<void> {
  for await (const { path, record } of terminalOwners(home)) {
    if (record.checkoutTerminal) continue;

    if (hasLiveGroupMembers(record.pid)) {
      if (!hasGroupOwner(record.pid, record.token))
        throw new Error('Shell process group identity changed');
      await releaseShellGroup(record.pid);
    }

    await forgetTerminalOwner(path);
  }
}
