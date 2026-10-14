import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { InstallTool } from '@repo/contracts';
import { findOnPath } from '../../resolver/path-lookup';
import type { InstallPorts } from '../ports';
import { InstallCleanupError } from '../processes/cleanup-error';

const toolNames: Record<InstallTool, string> = { node: 'Node.js', uv: 'uv' };

// Argo never installs Homebrew itself.
async function requireHomebrew(tool: InstallTool): Promise<void> {
  if (!(await findOnPath('brew')))
    throw new Error(
      `Homebrew isn’t on this Server. Install ${toolNames[tool]} from its download page.`,
    );
}

const removeStaging = (cwd: string): Promise<void> =>
  rm(cwd, { recursive: true, force: true });

// An installer that outlived its stop keeps its folder, so the next start releases it.
const releaseUnlessOwned = async (
  cwd: string,
  ownershipKept: boolean,
): Promise<void> => {
  if (!ownershipKept) await removeStaging(cwd);
};

type Running = { controller: AbortController; done: Promise<void> };

// Installs a missing tool with Homebrew, never Homebrew itself, under the same installer-process ownership as an Agent install.
export class ToolInstallations {
  private readonly running = new Map<InstallTool, Running>();
  private stopped = false;
  public constructor(
    private readonly home: string,
    private readonly ports: InstallPorts,
  ) {}

  // A second request for the same tool joins the one running.
  public install(tool: InstallTool): Promise<void> {
    if (this.stopped) throw new Error('Engine is stopping');
    const current = this.running.get(tool);

    if (current) return current.done;
    const controller = new AbortController();

    const done = this.run(tool, controller.signal).finally(() =>
      this.running.delete(tool),
    );

    this.running.set(tool, { controller, done });

    return done;
  }

  private async run(tool: InstallTool, signal: AbortSignal): Promise<void> {
    await requireHomebrew(tool);
    // A staging folder under Argo's Agents folder, so an interrupted installer is released at the next start.
    const cwd = join(this.home, 'agents', '.tools', `.install-${randomUUID()}`);
    await mkdir(cwd, { recursive: true });

    try {
      await this.brewInstall(tool, cwd, signal);
    } catch (error) {
      await releaseUnlessOwned(cwd, error instanceof InstallCleanupError);
      throw error;
    }

    await removeStaging(cwd);
  }
  private brewInstall(
    tool: InstallTool,
    cwd: string,
    signal: AbortSignal,
  ): Promise<string> {
    return this.ports.runTool({
      executable: 'brew',
      args: ['install', tool],
      cwd,
      signal,
      subject: toolNames[tool],
    });
  }

  public async shutdown(): Promise<void> {
    this.stopped = true;
    const running = [...this.running.values()];

    for (const { controller } of running)
      controller.abort(new Error('Engine stopped'));
    await Promise.all(running.map(({ done }) => done.catch(() => {})));
  }
}
