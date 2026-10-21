import type { PluginViewId } from '@repo/contracts/plugins/wire';
import {
  BackgroundPass,
  type BackgroundEntry,
  type BackgroundServices,
} from './background-pass';
import { backgroundFloorMs } from './query-intervals';

// At most this many headless passes run at once, so many Projects never burst into one crowd of calls.
const concurrentPasses = 4;

export class PluginBackground {
  private readonly plugins = new Map<string, BackgroundEntry>();
  private readonly declared = new Map<string, string>();
  private readonly passes = new Set<BackgroundPass>();
  private readonly gate = new PassGate();
  private projects = new Set<string>();

  constructor(private readonly services: BackgroundServices) {}

  // Only a changed path or interval restarts the passes; a reload always brings a fresh way to activate.
  configure(
    pluginId: string,
    declaration: BackgroundEntry['declaration'],
    activate: BackgroundEntry['activate'],
  ): void {
    const declared = JSON.stringify(declaration);
    const existing = this.plugins.get(pluginId);

    // The running passes hold this entry, so the newer activation replaces the old one in place.
    if (existing && this.declared.get(pluginId) === declared)
      existing.activate = activate;
    else this.restart(pluginId, declared, { declaration, activate });
  }

  private restart(
    pluginId: string,
    declared: string,
    { declaration, activate }: Omit<BackgroundEntry, 'pluginId'>,
  ): void {
    this.declared.set(pluginId, declared);

    const entry = {
      pluginId,
      declaration: this.clamp(pluginId, declaration),
      activate,
    };

    this.plugins.set(pluginId, entry);

    for (const pass of this.forPlugin(pluginId)) this.removePass(pass);

    for (const projectId of this.projects) this.add(entry, projectId);
  }

  private clamp(
    pluginId: string,
    declaration: BackgroundEntry['declaration'],
  ): BackgroundEntry['declaration'] {
    const interval = Math.max(backgroundFloorMs, declaration.interval);

    if (interval !== declaration.interval)
      this.services.log(
        `Plugin ${pluginId}: background interval ${declaration.interval} ms clamped to ${backgroundFloorMs} ms`,
      );

    return { ...declaration, interval };
  }

  syncProjects(projectIds: string[]): void {
    const projects = new Set(projectIds);

    for (const projectId of this.projects.difference(projects))
      this.removeProject(projectId);

    for (const projectId of projects.difference(this.projects))
      this.addProject(projectId);
    this.projects = projects;
  }

  private addProject(projectId: string): void {
    for (const entry of this.plugins.values()) this.add(entry, projectId);
  }

  private add(entry: BackgroundEntry, projectId: string): void {
    const pass = new BackgroundPass(entry, projectId, {
      ...this.services,
      enter: (): Promise<() => void> => this.gate.enter(),
    });

    this.passes.add(pass);
    pass.start();
  }

  private removeProject(projectId: string): void {
    for (const pass of this.passes
      .values()
      .filter((pass) => pass.projectId === projectId))
      this.removePass(pass);
    this.services.views.endProject(projectId);
    this.services.data.releaseProject(projectId);
  }

  rendered(viewId: PluginViewId): void {
    for (const pass of this.passes) pass.rendered(viewId);
  }

  released(viewId: PluginViewId): void {
    for (const pass of this.passes) pass.released(viewId);
  }

  remove(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.declared.delete(pluginId);

    for (const pass of this.forPlugin(pluginId)) this.removePass(pass);
  }

  private forPlugin(pluginId: string): IteratorObject<BackgroundPass> {
    return this.passes
      .values()
      .filter((pass) => pass.entry.pluginId === pluginId);
  }

  private removePass(pass: BackgroundPass): void {
    this.passes.delete(pass);
    pass.close();
  }

  close(): void {
    for (const pass of this.passes) this.removePass(pass);
    this.plugins.clear();
    this.declared.clear();
    this.projects.clear();
    this.gate.close();
  }
}

// Passes queue rather than overlap; a closed gate lets everyone waiting through to find itself stopped.
class PassGate {
  private running = 0;
  private closed = false;
  private readonly waiting = new Set<() => void>();

  async enter(): Promise<() => void> {
    if (this.running >= concurrentPasses && !this.closed) await this.queue();
    this.running += 1;

    return () => this.leave();
  }

  private queue(): Promise<void> {
    return new Promise<void>((resolve) => this.waiting.add(resolve));
  }

  private leave(): void {
    this.running -= 1;
    const next = this.waiting.values().next();

    if (next.done) return;
    this.waiting.delete(next.value);
    next.value();
  }

  close(): void {
    this.closed = true;

    for (const resolve of this.waiting) resolve();
    this.waiting.clear();
  }
}
