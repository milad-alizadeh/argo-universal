import { registryCacheColumns } from '../columns';
import type { ACPAgent } from './upstream/registry.gen';

export interface AgentsRegistryOutput {
  agents: { entry: ACPAgent; support: 'binary' | 'npx' | 'unavailable' }[];
  error: string | null;
}

export type { BinaryTarget } from './upstream/registry.gen';

export const RegistryCacheRecord = registryCacheColumns;
