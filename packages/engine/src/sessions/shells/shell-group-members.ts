import { execFileSync } from 'node:child_process';

// Full command lines are only needed to identify the recorded group leader.
const memberColumns = 'pid=,pgid=,stat=';

const processTable = (args: string[]): string => {
  try {
    return execFileSync('/bin/ps', args, { encoding: 'utf8' });
  } catch (error) {
    throw new Error('Process group cannot be observed', { cause: error });
  }
};

const isLiveMember = (
  group: string | undefined,
  state: string | undefined,
  expected: number,
): boolean =>
  Boolean(state && !state.startsWith('Z') && Number(group) === expected);

export const hasLiveGroupMembers = (group: number): boolean =>
  processTable(['-A', '-o', memberColumns])
    .split('\n')
    .some((line) => {
      const [, memberGroup, state] = line.trim().split(/\s+/);

      return isLiveMember(memberGroup, state, group);
    });

export const hasGroupOwner = (pid: number, token: string): boolean =>
  processTable(['-p', String(pid), '-ww', '-o', `${memberColumns},command=`])
    .split('\n')
    .some((line) => {
      const [memberPid, group, state, ...command] = line.trim().split(/\s+/);

      return (
        Number(memberPid) === pid &&
        isLiveMember(group, state, pid) &&
        command.join(' ').includes(token)
      );
    });
