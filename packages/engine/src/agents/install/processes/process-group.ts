import {
  processGroupMembers,
  type ProcessGroupMember,
} from '../../../lib/process-group-members';
import { InstallCleanupError } from './cleanup-error';

export type InstallerGroupMember = ProcessGroupMember;

export const installerGroupMembers = (
  group: number,
): InstallerGroupMember[] => {
  try {
    return processGroupMembers(group);
  } catch (error) {
    throw new InstallCleanupError(
      'Installer process group cannot be observed',
      { cause: error },
    );
  }
};
