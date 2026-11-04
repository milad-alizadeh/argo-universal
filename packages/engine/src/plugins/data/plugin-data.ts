import type {
  PluginQuery,
  PluginDataRequest,
  PluginDataState,
} from '@repo/contracts/plugins/argo-calls';
import type { PageAddress } from '@repo/contracts/plugins/page-address';
import { runtimeError, type PluginReply } from '../protocol/runtime';
import type { WorkerCalls } from '../runtime/worker-calls';
import { boundWarm, keepNewest, queryKey, removeWhere } from './entry-map';
import { NamedReads } from './named-reads';
import { PluginBadges } from './plugin-badges';
import { QueryEntry, type EntryServices } from './query-entry';
import type { QueryOwner, QueryServices } from './query-types';

type Caller = Pick<QueryOwner, 'pluginId' | 'generation'>;

// The draw a Loader's read is for: its id, and the Page address holding the read, or none for a background pass.
export type DrawnFor = { draw: number; holder?: PageAddress };

/*
 * Where a Loader's read came from: the Project its Query is for and the draw. The runtime works it out
 * from the draw the call runs for, so this module needs no draws.
 */
export type QueryOrigin = { projectId?: string; drawn?: DrawnFor };

/*
 * The one cache of a Plugin's reads (ADR-0037, ADR-0050): an entry per Plugin, Project and Query, held by
 * the Page addresses whose draws read it; a background pass reads it fresh. A
 * write makes the Plugin's entries due; an answer that changes marks the addresses holding it.
 */
export class PluginData {
  readonly badges;
  readonly reads;
  private readonly plugins = new Map<string, Map<string, QueryEntry>>();
  private readonly services: EntryServices;

  constructor(
    services: QueryServices,
    private readonly workers: WorkerCalls,
    marked: EntryServices['marked'],
  ) {
    this.badges = new PluginBadges(services.log);
    this.reads = new NamedReads(workers);
    this.services = { ...services, reads: this.reads, marked };
    workers.watch((pluginId) => this.forgetEndedReads(pluginId));
  }

  async handle(
    caller: Caller,
    request: PluginDataRequest,
    origin: QueryOrigin,
  ): Promise<PluginReply> {
    try {
      return await this.operate(caller, request, origin);
    } catch (cause) {
      return { ok: false, error: runtimeError(cause) };
    }
  }

  private async operate(
    caller: Caller,
    request: PluginDataRequest,
    origin: QueryOrigin,
  ): Promise<PluginReply> {
    return { ok: true, value: await this.read(caller, origin, request) };
  }

  // A background pass reads every Query fresh, so the answers it warms are the ones the pages draw next.
  private read(
    caller: Caller,
    { projectId, drawn }: QueryOrigin,
    { query, fresh }: PluginDataRequest,
  ): Promise<PluginDataState> {
    if (!drawn) throw new Error('A Query is read only during a draw');

    const entries = this.entriesOf(caller.pluginId);
    const entry = this.entry(caller, projectId, query);

    boundWarm(entries, this.services.log, caller.pluginId);

    return entry.read({
      ...drawn,
      fresh: fresh === true || drawn.holder === undefined,
    });
  }

  private entry(
    caller: Caller,
    projectId: string | undefined,
    query: PluginQuery,
  ): QueryEntry {
    const entries = this.entriesOf(caller.pluginId);
    const key = queryKey(projectId, query);

    const existing = entries.get(key);

    if (existing) return keepNewest(entries, key, existing);
    const owner = { ...caller, projectId, query };
    const entry = new QueryEntry(owner, this.services);

    entries.set(key, entry);

    return entry;
  }

  private entriesOf(pluginId: string): Map<string, QueryEntry> {
    const existing = this.plugins.get(pluginId);

    if (existing) return existing;
    const entries = new Map<string, QueryEntry>();
    this.plugins.set(pluginId, entries);

    return entries;
  }

  // A named read is the code of the generation that defined it, so a generation that ends takes its answers.
  private forgetEndedReads(pluginId: string): void {
    const running = this.workers.generation(pluginId);

    removeWhere(
      this.entriesOf(pluginId),
      ({ owner }) => owner.query.api === 'read' && owner.generation !== running,
    );
  }

  release(pluginId: string): void {
    this.badges.release(pluginId);

    for (const entry of this.entriesOf(pluginId).values()) entry.close();
    this.plugins.delete(pluginId);
  }

  releaseProject(projectId: string): void {
    for (const entries of this.plugins.values())
      removeWhere(entries, ({ owner }) => owner.projectId === projectId);
  }

  // One of the Plugin's Operations ran, or it said `argo.changed()`: every answer it kept is due.
  written(pluginId: string): void {
    for (const entry of this.entriesOf(pluginId).values()) entry.written();
  }

  // A storage write makes only the Plugin's storage reads due.
  storageWritten(pluginId: string): void {
    for (const entry of this.entriesOf(pluginId).values())
      if (entry.owner.query.api === 'storage') entry.written();
  }
}
