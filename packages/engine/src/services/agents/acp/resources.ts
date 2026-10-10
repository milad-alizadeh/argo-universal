import { CheckoutReleases } from './checkout-releases';
import { AcpResourceEntry } from './resource-entry';
import type {
  AcpOpenInput,
  AcpResourceInput,
  AcpResources,
  AcpSessionLease,
  AgentLaunch,
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
  private readonly checkoutReleases: CheckoutReleases;
  private stopped = false;
  public constructor(private readonly input: AcpResourceInput) {
    this.checkoutReleases = new CheckoutReleases(input.releaseTimeoutMs);
  }
  public open = (opening: AcpOpenInput): Promise<AcpSessionLease> => {
    if (this.stopped)
      return Promise.reject(new Error('ACP resources are stopped'));
    const launch = captureLaunch(opening.launch);
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
    void entry
      .closed()
      .then(() => this.forget(key, entry))
      .catch(() => {});
    return entry;
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
