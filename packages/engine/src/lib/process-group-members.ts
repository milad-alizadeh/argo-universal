import { execFileSync } from 'node:child_process';

export type ProcessGroupMember = {
  pid: number;
  group: number;
  state: string;
  command: string;
};

const parseMember = (line: string): ProcessGroupMember | undefined => {
  const [pid, group, state, ...command] = line.trim().split(/\s+/);

  if (!group) return undefined;

  return {
    pid: Number(pid),
    group: Number(group),
    state: state ?? '',
    command: command.join(' '),
  };
};

const processTableArguments = ['-A', '-ww', '-o', 'pid=,pgid=,stat=,command='];

const processTable = (): string => {
  try {
    return execFileSync('/bin/ps', processTableArguments, { encoding: 'utf8' });
  } catch (error) {
    throw new Error('Process group cannot be observed', { cause: error });
  }
};

export const processGroupMembers = (group: number): ProcessGroupMember[] =>
  processTable()
    .split('\n')
    .map(parseMember)
    .filter((member) => member !== undefined)
    .filter(
      (member) => member.group === group && !member.state.startsWith('Z'),
    );

type ProcessParent = { pid: number; parent: number };

const parseParent = (line: string): ProcessParent => {
  const [pid, parent] = line.trim().split(/\s+/);

  return { pid: Number(pid), parent: Number(parent) };
};

const processParents = (): ProcessParent[] =>
  execFileSync('/bin/ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .map(parseParent);

export const processDescendants = (root: number): number[] => {
  const parents = processParents();
  const descendants: number[] = [];
  const pending = [root];

  for (const parent of pending) {
    const children = parents.flatMap((member) =>
      member.parent === parent ? [member.pid] : [],
    );

    descendants.push(...children);
    pending.push(...children);
  }

  return descendants;
};
