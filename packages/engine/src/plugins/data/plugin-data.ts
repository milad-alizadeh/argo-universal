import type {
  PluginQuery,
  PluginDataRequest,
  PluginDataState,
} from '@repo/contracts/plugins/argo-calls';
import { runtimeError, type PluginReply } from '../protocol/runtime';
import type { WorkerCalls } from '../runtime/worker-calls';
import { boundWarm, removeWhere } from './entry-map';
import { EntryWrites } from './entry-writes';
import { NamedReads } from './named-reads';
import { PluginBadges } from './plugin-badges';
import { QueryEntry, type EntryServices } from './query-entry';
import {
  drawnRead,
  entryIn,
  namedProject,
  projectOf,
  refuseOutside,
  requireRegistered,
} from './query-scope';
import type { QueryOrigin } from './query-types';
import type { QueryOwner, QueryServices } from './query-types';

type ReadRequest = Extract<PluginDataRequest, { action: 'read' }>;

type Caller = Pick<QueryOwner, 'pluginId' | 'generation'>;

/*
 * The one cache of a Plugin's reads (ADR-0037, ADR-0050): an entry per Plugin, Project and Query, held by
 * the Page addresses whose draws read it; a background pass reads it fresh. A
 * write makes the Plugin's entries due; an answer that changes marks the addresses holding it.
 */
export class PluginData {
  readonly badges;
  readonly reads;
  // What a Plugin's changes and its lists' clocks do to its entries.
  readonly writes = new EntryWrites((id) => this.entriesOf(id));
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
    return {
      ok: true,
      value:
        request.action === 'seed'
          ? await this.seed(caller, origin, request)
          : await this.read(caller, origin, request),
    };
  }

  // A named read's answer for another named read's Query, kept for the Project that Query names, or the one the first runs for.
  private async seed(
    caller: Caller,
    { projectId }: QueryOrigin,
    { query, value }: Extract<PluginDataRequest, { action: 'seed' }>,
  ): Promise<null> {
    if (query.api !== 'read')
      throw new Error('Only a named read can be seeded');

    await requireRegistered(this.projects, [query.projectId]);

    // A seed from a read a write overtook would revive an answer the write made stale.
    if (!this.overtaken(caller.pluginId))
      this.entry(caller, projectOf(query, projectId), query).seed(value);

    return null;
  }

  // The Projects Argo has registered; the call keeps its receiver.
  private readonly projects = (): ReturnType<
    QueryServices['services']['projectIds']
  > => this.services.services.projectIds();

  private overtaken(pluginId: string): boolean {
    return [...this.entriesOf(pluginId).values()].some(
      (entry) => entry.overtaken,
    );
  }

  /*
   * A background pass reads every Query fresh, so the answers it warms are the ones the pages draw next. Code
   * outside a draw reads the kept answer, for the Project it names, and holds nothing.
   */
  private read(
    caller: Caller,
    origin: QueryOrigin,
    request: ReadRequest,
  ): Promise<PluginDataState> {
    refuseOutside(origin, request.query);

    const named = [request.projectId, namedProject(request.query)];
    const checking = requireRegistered(this.projects, named);

    const start = (): Promise<PluginDataState> =>
      this.start(caller, origin, request);

    // With no Project named there is nothing to wait for, so the read starts in the same turn.
    return checking ? checking.then(start) : start();
  }

  // Begins the read on the entry it is for.
  private start(
    caller: Caller,
    { projectId, drawn, forRun }: QueryOrigin,
    { query, projectId: named, fresh }: ReadRequest,
  ): Promise<PluginDataState> {
    const project = projectOf(query, named ?? projectId);
    const entry = this.entry(caller, project, query);

    return entry.read(drawnRead(drawn, fresh, forRun));
  }

  private entry(
    caller: Caller,
    projectId: string | undefined,
    query: PluginQuery,
  ): QueryEntry {
    const entries = this.entriesOf(caller.pluginId);

    const entry = entryIn(
      entries,
      { ...caller, projectId, query },
      this.services,
    );

    // The Plugin keeps a bounded number of warm entries.
    boundWarm(entries, this.services.log, caller.pluginId);

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

  // A new worker runs: every answer the Plugin kept is due.
  readonly written = (pluginId: string): void => this.writes.written(pluginId);

  // A storage write makes only the Plugin's storage reads due.
  readonly storageWritten = (pluginId: string): void =>
    this.writes.storageWritten(pluginId);
}
