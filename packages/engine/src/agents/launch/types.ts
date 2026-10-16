import type { ACPAgent } from '@repo/contracts';
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
  ports: InstallPorts;
  bundledNode?: string;
  bundledNpm?: string;
  isDirectoryInUse: (directory: string) => boolean;
};


export type EntryInput = CommandInput & { entry: ACPAgent };

export type RegistryCommand = {
  /** Release after a connection owns directory, or when abandoning this command. Aborting the input also releases it. */
  release: () => void;
  executable: string;
  args: readonly string[];
  env: Record<string, string>;
  directory: string;
  version: string;
};
