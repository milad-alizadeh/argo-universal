import { z } from 'zod';
import { RegistryAgentId } from '../agents/servers';
import type { OperationDefinition } from './index';
import { InstalledAgentResult, RegistryResult } from './registry-results';

export const registryOperations = {
  'registry.get': {
    id: 'registry.get',
    label: 'Read Registry',
    description:
      'Read available Agents from the cached ACP Registry and their launch support.',
    params: z.strictObject({}).default({}),
    result: RegistryResult,
    tier: 'read',
    keywords: ['agents', 'catalog', 'available'],
  },
  'registry.refresh': {
    id: 'registry.refresh',
    label: 'Refresh Registry',
    description:
      'Fetch the latest ACP Registry and replace the cached available Agents.',
    params: z.strictObject({}).default({}),
    result: RegistryResult,
    tier: 'confirm',
    keywords: ['agents', 'catalog', 'reload'],
  },
  'registry.sync': {
    id: 'registry.sync',
    label: 'Sync Registry',
    description:
      'Fetch the ACP Registry when the cached copy is stale, then list available Agents.',
    params: z.strictObject({}).default({}),
    result: RegistryResult,
    tier: 'confirm',
    keywords: ['agents', 'catalog', 'cache'],
  },
  'agent.list': {
    id: 'agent.list',
    label: 'List Installed Agents',
    description: 'List Installed Agents and their saved launch environment.',
    params: z.strictObject({}).default({}),
    result: z.array(InstalledAgentResult),
    tier: 'read',
    keywords: ['installed', 'saved', 'models'],
  },
  'agent.install': {
    id: 'agent.install',
    label: 'Install Agent',
    description:
      'Install a Registry Agent by id so it is available for new Sessions.',
    params: RegistryAgentId,
    result: z.null(),
    tier: 'confirm',
    keywords: ['registry', 'add', 'download'],
  },
  'agent.remove': {
    id: 'agent.remove',
    label: 'Remove Agent',
    description:
      'Remove an Installed Agent and close its pooled Agent connections.',
    params: RegistryAgentId,
    result: z.null(),
    tier: 'confirm',
    keywords: ['uninstall', 'delete', 'registry'],
  },
} as const satisfies Record<string, OperationDefinition>;
