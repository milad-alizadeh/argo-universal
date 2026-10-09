import { AcpResourceEntry } from './resource-entry';
import type {
  AcpOpenInput,
  AcpResourceInput,
  AcpResources,
  AcpSessionLease,
  AgentLaunch,
} from './resource-types';

const captureLaunch = (launch: AgentLaunch): AgentLaunch => ({
  projectId: launch.projectId,
  agentId: launch.agentId,
  executable: launch.executable,
  version: launch.version,
  args: [...launch.args],
  cwd: launch.cwd,
  env: Object.fromEntries(
    Object.entries(launch.env).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  ),
  authContext: launch.authContext,
});
const launchKey = (launch: AgentLaunch): string => JSON.stringify(launch);
class EngineAcpResources implements AcpResources {
  private readonly entries = new Map<string, AcpResourceEntry>();
  private stopped = false;
  public constructor(private readonly input: AcpResourceInput) {}
  public open = (opening: AcpOpenInput): Promise<AcpSessionLease> => {
    if (this.stopped)
      return Promise.reject(new Error('ACP resources are stopped'));
    const launch = captureLaunch(opening.launch);
    return this.entry(launch).open({ ...opening, launch });
  };
  private entry(launch: AgentLaunch): AcpResourceEntry {
    const key = launchKey(launch);
    const existing = this.entries.get(key);
    if (existing) return existing;
    const entry = new AcpResourceEntry(this.input, launch);
    this.entries.set(key, entry);
    void entry
      .closed()
      .then(() => this.entries.delete(key))
      .catch(() => {});
    return entry;
  }
  public async shutdown(): Promise<void> {
    this.stopped = true;
    await Promise.all(
      [...this.entries.values()].map((entry) => entry.shutdown()),
    );
  }
}
export const createAcpResources = (
  input: AcpResourceInput = {},
): AcpResources => new EngineAcpResources(input);
