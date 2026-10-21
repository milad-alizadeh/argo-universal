import type { PluginProjectInfo } from '@repo/contracts/plugins';
import type { PluginRuntime } from '@repo/engine/plugins';
import type { ConfiguredTest } from './test-runtime';

export class TestProjects {
  constructor(
    private readonly options: ConfiguredTest,
    private readonly runtime: PluginRuntime,
  ) {}

  async add({
    path,
    ...project
  }: PluginProjectInfo & { path: string }): Promise<void> {
    this.options.projectPaths[project.id] = path;
    this.options.projects = this.options.projects.filter(
      ({ id }) => id !== project.id,
    );
    this.options.projects.push(project);
    await this.runtime.refreshProjects();
  }

  async remove(projectId: string): Promise<void> {
    delete this.options.projectPaths[projectId];
    this.options.projects = this.options.projects.filter(
      ({ id }) => id !== projectId,
    );
    await this.runtime.refreshProjects();
  }
}
