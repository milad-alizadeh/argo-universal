import type { Database } from '@repo/db';
import type { InstallPorts } from '../install/ports';
import type { RegistryActor } from '../registry/registry-machine';

export type CommandInput = {
  database: Database;
  registry: RegistryActor;
  home: string;
  id: string;
  shellEnv: Readonly<Record<string, string>>;
  signal: AbortSignal;
  ports?: InstallPorts;
  bundledNode?: string;
  bundledNpm?: string;
  isDirectoryInUse: (directory: string) => boolean;
};

export type RegistryCommand = {
  executable: string;
  args: readonly string[];
  env: Record<string, string>;
  directory: string;
  version: string;
};
