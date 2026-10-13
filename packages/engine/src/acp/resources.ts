import type { AgentLaunch } from '../agents';
import {
  authenticationContextKey,
  ResourceInUseError,
} from '../lib/authentication-context';
import { CheckoutReleases } from './checkout-releases';
import { AcpResourceEntry } from './resource-entry';
import type {
  AcpOpenInput,
  AcpResourceInput,
  AcpResources,
  AcpSessionLease,
} from './resource-types';

const compareEnvironmentKeys = (
  [left]: [string, string],
  [right]: [string, string],
): number => {
  if (left === right) return 0;
  return left < right ? -1 : 1;
};
const captureLaunch = (launch: AgentLaunch): AgentLaunch => ({
  projectId: launch.projectId,
  agentId: launch.agentId,
  executable: launch.executable,
  version: launch.version,
  args: [...launch.args],
  cwd: launch.cwd,
  env: Object.fromEntries(
    Object.entries(launch.env).sort(compareEnvironmentKeys),
  ),
  authContext: launch.authContext,
});
const createLaunchReuseKey = (launch: AgentLaunch): string =>
  JSON.stringify(launch);
class EngineAcpResources implements AcpResources {
  private readonly entries = new Map<string, AcpResourceEntry>();
  private readonly retired = new Set<AcpResourceEntry>();
  private readonly authentication = new Map<string, symbol>();
  private readonly contexts = new Map<AcpResourceEntry, string>();
  private readonly agents = new Map<AcpResourceEntry, string>();
  private readonly checkoutReleases: CheckoutReleases;
  private stopped = false;
  public constructor(private readonly input: AcpResourceInput) {
    this.checkoutReleases = new CheckoutReleases(input.releaseTimeoutMs);
  }
  public open = (opening: AcpOpenInput): Promise<AcpSessionLease> => {
    if (this.stopped)
      return Promise.reject(new Error('ACP resources are stopped'));
    const launch = captureLaunch(opening.launch);
    if (this.authentication.has(authenticationContextKey(launch)))
      return Promise.reject(new Error('Agent sign-in is in progress'));
    return this.getOrStartResource(launch).open({ ...opening, launch }, () =>
      this.checkoutReleases.confirm(opening.opening.params.cwd),
    );
  };
  private getOrStartResource(launch: AgentLaunch): AcpResourceEntry {
    const key = createLaunchReuseKey(launch);
    const existing = this.entries.get(key);
    if (existing) return existing;
    const entry = new AcpResourceEntry(this.input, launch, (checkouts) =>
      this.retireFailedGeneration(key, entry, checkouts),
    );
    this.entries.set(key, entry);
    this.rememberLaunch(entry, launch);
    void entry
      .closed()
      .then(() => this.forget(key, entry))
      .catch(() => {});
    return entry;
  }
  private rememberLaunch(entry: AcpResourceEntry, launch: AgentLaunch): void {
    this.contexts.set(entry, authenticationContextKey(launch));
    this.agents.set(entry, launch.agentId);
  }
  private retireFailedGeneration(
    key: string,
    entry: AcpResourceEntry,
    checkouts: readonly string[],
  ): void {
    if (this.entries.get(key) === entry) this.entries.delete(key);
    this.retired.add(entry);
    this.checkoutReleases.retain(checkouts, entry.closed());
  }
  // A replacement may already hold the key of a generation that exits later.
  private forget(key: string, entry: AcpResourceEntry): void {
    if (this.entries.get(key) === entry) this.entries.delete(key);
    this.retired.delete(entry);
    this.contexts.delete(entry);
    this.agents.delete(entry);
  }
  public isAgentInUse = (agentId: string): boolean =>
    [...this.agents.values()].includes(agentId);
  public reserveAuthentication = (launch: AgentLaunch): (() => void) => {
    if (this.stopped) throw new Error('ACP resources are stopped');
    const key = authenticationContextKey(launch);
    if (this.isAuthenticationContextInUse(key)) throw new ResourceInUseError();
    const reservation = Symbol();
    this.authentication.set(key, reservation);
    return (): void => {
      if (this.authentication.get(key) === reservation)
        this.authentication.delete(key);
    };
  };
  private isAuthenticationContextInUse(key: string): boolean {
    return (
      this.authentication.has(key) || [...this.contexts.values()].includes(key)
    );
  }
  public async shutdown(): Promise<void> {
    this.stopped = true;
    await Promise.all(
      [...this.entries.values(), ...this.retired].map((entry) =>
        entry.shutdown(),
      ),
    );
  }
}
export const createAcpResources = (
  input: AcpResourceInput = {},
): AcpResources => new EngineAcpResources(input);
