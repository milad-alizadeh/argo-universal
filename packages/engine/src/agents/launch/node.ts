import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { delimiter, dirname, join } from 'node:path';
import { probeNode } from './node-probe';
import type { PortedInput as NodeInput } from './types';

export type NodeRuntime = {
  node: string;
  npm: string;
  env: Record<string, string>;
};

const minimumMajor = 22;

const usableNode = async (
  input: NodeInput,
  executable: string,
): Promise<boolean> => {
  try {
    const version = await probeNode(input, executable);

    return (
      Number(version.trim().replace(/^v/, '').split('.')[0]) >= minimumMajor
    );
  } catch {
    input.signal.throwIfAborted();

    return false;
  }
};

const isExecutable = async (file: string): Promise<boolean> => {
  try {
    await access(file, constants.X_OK);

    return true;
  } catch {
    return false;
  }
};

const executableOnPath = async (
  path: string,
  name: string,
): Promise<string | undefined> => {
  for (const folder of path.split(delimiter).filter(Boolean)) {
    const candidate = join(folder, name);

    if (await isExecutable(candidate)) return candidate;
  }

  return undefined;
};

const shellRuntime = async (
  input: NodeInput,
): Promise<NodeRuntime | undefined> => {
  const path = shellPath(input);
  const node = await executableOnPath(path, 'node');
  const npm = await executableOnPath(path, 'npm');

  if (!node) return undefined;

  if (!npm) return undefined;

  return checkedRuntime(input, node, npm);
};

export const resolveNode = async (input: NodeInput): Promise<NodeRuntime> => {
  const shell = await shellRuntime(input);

  if (shell) return shell;

  return bundledRuntime(input);
};

const bundledRuntime = async (input: NodeInput): Promise<NodeRuntime> => {
  const node = input.bundledNode ?? process.execPath;
  const npm = bundledNpm(input, node);

  if (!(await usableNode(input, node)))
    throw new Error('Node.js 22 or newer is required on the Server');

  return runtime(input, node, npm);
};

const runtime = (input: NodeInput, node: string, npm: string): NodeRuntime => ({
  node,
  npm,
  env: {
    ...input.shellEnv,
    PATH: [dirname(node), input.shellEnv.PATH].filter(Boolean).join(delimiter),
  },
});

const shellPath = (input: NodeInput): string => input.shellEnv.PATH ?? '';

const bundledNpm = (input: NodeInput, node: string): string =>
  input.bundledNpm ?? join(dirname(node), 'npm');

const checkedRuntime = async (
  input: NodeInput,
  node: string,
  npm: string,
): Promise<NodeRuntime | undefined> =>
  (await usableNode(input, node)) ? runtime(input, node, npm) : undefined;
