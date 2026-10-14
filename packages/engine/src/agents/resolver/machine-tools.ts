import type { MachineTools } from '@repo/contracts';
import { findOnPath } from './path-lookup';

const allOnPath = async (names: readonly string[]): Promise<boolean> =>
  (await Promise.all(names.map(findOnPath))).every(Boolean);

// npx Agents need Node.js and npm, uvx Agents need uv, and Homebrew can install either; PATH is read each time.
export const lookForTools = async (): Promise<MachineTools> => {
  const [node, uv, brew] = await Promise.all([
    allOnPath(['node', 'npm']),
    allOnPath(['uv']),
    allOnPath(['brew']),
  ]);

  return { node, uv, brew };
};
