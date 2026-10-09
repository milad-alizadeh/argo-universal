import type {
  ACPAgent,
  AgentsCatalogInput,
  AgentsCatalogOutput,
  RegistrySupport,
} from '@repo/contracts';
import { type AnyActorRef, waitFor } from 'xstate';
import { isMachineActor } from '../../../lib/machine-actor';
import {
  agentCatalogId,
  catalogMachine,
  type CatalogActorRef,
} from './catalog-machine';

function distributionFor(entry: ACPAgent, platform: string): RegistrySupport {
  const binary = entry.distribution.binary?.[platform];
  if (binary) return { kind: 'binary', recipe: binary };
  return packageDistribution(entry, platform);
}

function packageDistribution(
  entry: ACPAgent,
  platform: string,
): RegistrySupport {
  const packageKind = entry.distribution.npx ? 'npx' : 'uvx';
  const recipe = entry.distribution[packageKind];
  if (recipe) return { kind: packageKind, recipe };
  return { kind: 'unsupported', reason: `No distribution for ${platform}` };
}

function matchesSearch(entry: ACPAgent, search: string): boolean {
  return `${entry.id} ${entry.name} ${entry.description}`
    .toLowerCase()
    .includes(search);
}

export async function browseCatalog(
  actor: CatalogActorRef,
  request: AgentsCatalogInput,
): Promise<AgentsCatalogOutput> {
  await waitFor(actor, (snapshot): boolean => !snapshot.matches('hydrating'));
  if (shouldRefresh(actor, request)) actor.send({ type: 'catalog.refresh' });
  const { context } = await waitFor(actor, (snapshot): boolean =>
    snapshot.matches('ready'),
  );
  return catalogResult(context, searchTerm(request));
}

type CatalogContext = ReturnType<CatalogActorRef['getSnapshot']>['context'];

function shouldRefresh(
  actor: CatalogActorRef,
  request: AgentsCatalogInput,
): boolean {
  return request?.refresh === true || actor.getSnapshot().matches('idle');
}

function searchTerm(request: AgentsCatalogInput): string {
  return (request?.search ?? '').trim().toLowerCase();
}

function catalogEntries(
  context: CatalogContext,
  search: string,
): AgentsCatalogOutput['agents'] {
  return (context.registry?.agents ?? [])
    .filter((entry): boolean => matchesSearch(entry, search))
    .map((entry) => ({
      entry,
      support: distributionFor(entry, context.platform),
    }));
}

function catalogStatus(context: CatalogContext): AgentsCatalogOutput['status'] {
  if (!context.registry) return 'unavailable';
  return context.error ? 'stale' : 'fresh';
}

function catalogResult(
  context: CatalogContext,
  search: string,
): AgentsCatalogOutput {
  return {
    agents: catalogEntries(context, search),
    serverPlatform: context.platform,
    status: catalogStatus(context),
    fetchedAt: context.fetchedAt,
    error: context.error,
    rejectedValues: context.storage.reader.count(),
  };
}

export function browseAgentCatalog(
  system: AnyActorRef['system'],
  request: AgentsCatalogInput,
): Promise<AgentsCatalogOutput> {
  const actor = system.get(agentCatalogId);
  if (!isMachineActor(actor, catalogMachine))
    throw new Error('Agent catalog is not running');
  return browseCatalog(actor, request);
}
