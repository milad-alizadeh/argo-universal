import { realpath } from 'node:fs/promises';
import type { ACPAgent, InstallationOwner } from '@repo/contracts';
import { homebrewFormula } from './owner';
import { npmPackageName } from './package-version';

export type OwnedCopy = {
  owner: InstallationOwner;
  // The launch file the Resolver found on PATH.
  executable: string;
  entry: ACPAgent;
  // The catalog's release, which npm installs exactly.
  version: string;
};

const brewUpgrade = async (executable: string): Promise<string | undefined> => {
  const formula = homebrewFormula(
    await realpath(executable).catch(() => executable),
  );

  return formula && `brew upgrade ${formula.name}`;
};

const npmInstall = ({ entry, version }: OwnedCopy): string | undefined => {
  const name = npmPackageName(entry);

  return name && `npm install -g ${name}@${version}`;
};

// The command the user runs to update a copy Homebrew or npm owns; Argo never runs it. Argo's own copy and an unknown owner have none.
export const ownerUpdateCommand = async (
  copy: OwnedCopy,
): Promise<string | undefined> => {
  if (copy.owner === 'homebrew') return brewUpgrade(copy.executable);

  return copy.owner === 'npm' ? npmInstall(copy) : undefined;
};
