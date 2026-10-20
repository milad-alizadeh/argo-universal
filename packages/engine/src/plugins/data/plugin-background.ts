import type { PluginViewId } from '@repo/contracts/plugins/wire';
import {
  BackgroundPass,
  type BackgroundEntry,
  type BackgroundServices,
} from './background-pass';
import { backgroundFloorMs } from './query-intervals';

export class PluginBackground {
  private readonly plugins = new Map<string, BackgroundEntry>();
  private readonly passes = new Set<BackgroundPass>();
  private projects = new Set<string>();

  constructor(private readonly services: BackgroundServices) {}

  configure(
    pluginId: string,
    declaration: BackgroundEntry['declaration'],
    activate: BackgroundEntry['activate'],
  ): void {
    if (this.plugins.has(pluginId)) return;

    const entry = {
      pluginId,
      declaration: this.clamp(pluginId, declaration),
      activate,
    };

    this.plugins.set(pluginId, entry);

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
    const pass = new BackgroundPass(entry, projectId, this.services);

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

  pause(pluginId: string): void {
    for (const pass of this.forPlugin(pluginId)) pass.pause();
  }

  resume(pluginId: string): void {
    for (const pass of this.forPlugin(pluginId)) pass.resume();
  }

  remove(pluginId: string): void {
    this.plugins.delete(pluginId);

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
    this.projects.clear();
  }
}
