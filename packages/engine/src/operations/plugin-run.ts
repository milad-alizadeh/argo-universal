import type { OperationRow } from '@repo/contracts/operations';
import type { OperationRunResponse } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { splitPluginOperationId } from '@repo/contracts/plugins/plugin-operations';
import type { PluginsRouterDeps } from '../plugins';
import type { CalledOperation, Sessions } from '../sessions';
import { recordOperation } from './call-recording';
import type { SessionCaller, TokenCaller } from './session-tokens';

export type PluginOperation = { id: string; pluginId: string; name: string };

// What a Plugin Operation's Tool call shows: the Operation it ran and the params it was given.
export const pluginOperationCall = (
  { id }: PluginOperation,
  row: OperationRow,
  params: Json,
): CalledOperation => ({ name: id, label: row.label, input: params });

function matches(row: OperationRow, search: string): boolean {
  return [row.id, row.label, ...row.keywords].some((value) =>
    value.toLowerCase().includes(search),
  );
}

/*
 * The Operations running Plugins add to the registry (ADR-0044). A Plugin reaches only its own Project
 * and the Session that called it, so its Operations are `read` or `act` and need no scope of their own.
 */
export class PluginOperationRouter {
  public constructor(
    private readonly deps: PluginsRouterDeps,
    private readonly sessions: Sessions,
  ) {}

  // A Plugin that cannot be listed leaves the core registry answerable on its own.
  public listed(filter: string): Promise<OperationRow[]> {
    return this.rows(filter).catch(() => []);
  }

  public async rows(filter: string): Promise<OperationRow[]> {
    const rows = await this.deps.operations.rows();
    const search = filter.toLowerCase();

    return rows.filter((row) => matches(row, search));
  }

  // The Plugin Operation an id names, or nothing when no Plugin declares it.
  public async find(id: string): Promise<PluginOperation | null> {
    const split = splitPluginOperationId(id);

    if (!split) return null;

    const rows = await this.deps.operations.rows();

    return rows.some((row) => row.id === id) ? { id, ...split } : null;
  }

  public async row(id: string): Promise<OperationRow> {
    const rows = await this.deps.operations.rows();
    const row = rows.find((found) => found.id === id);

    if (!row) throw new Error(`Unknown Operation ${id}`);

    return row;
  }

  /*
   * A Plugin's Operation for the caller that asked: the Plugin checks nothing of the caller, so core
   * hands it only the caller's own Session and Project, and a Session's run is a Tool call like any other.
   * A Plugin answers JSON, which needs no stored Blob, so its result is returned as it came.
   */
  public async runFor(
    caller: TokenCaller,
    plugin: PluginOperation,
    params: Json,
  ): Promise<OperationRunResponse> {
    const run = (): Promise<Json> => this.run(plugin, params, caller);

    if (caller.kind === 'user') return { kind: 'result', result: await run() };

    const row = await this.row(plugin.id);
    const called = pluginOperationCall(plugin, row, params);

    return { kind: 'result', result: await this.recorded(caller, called, run) };
  }

  // A Session's own run is a Tool call like any other, named by the Operation it ran.
  private recorded(
    caller: SessionCaller,
    called: CalledOperation,
    run: () => Promise<Json>,
  ): Promise<Json> {
    const call = this.sessions.call(caller.sessionId, called);

    return recordOperation(call, run, (value) => value).result;
  }

  private run(
    { pluginId, name }: PluginOperation,
    params: Json,
    caller: TokenCaller,
  ): Promise<Json> {
    return this.deps.operations.run({
      pluginId,
      name,
      params,
      caller: callerOf(caller),
    });
  }
}

// The user's own run names no Session; a Session's names it and the Project it works in.
const callerOf = (
  caller: TokenCaller,
): { sessionId?: string; projectId?: string } =>
  caller.kind === 'session'
    ? { sessionId: caller.sessionId, projectId: caller.projectId }
    : {};
