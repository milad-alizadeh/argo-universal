import type { BackgroundServices } from './background-pass';
import { PluginBackground } from './plugin-background';

// The Background passes and the Watches (ADR-0055): two sets of per-Project runs on one machinery.
export class PluginPasses {
  readonly background: PluginBackground;
  readonly watching: PluginBackground;

  // The Background passes release a removed Project's kept answers; the Watches keep none of their own.
  constructor(services: Omit<BackgroundServices, 'kind'>) {
    this.background = new PluginBackground({
      ...services,
      kind: 'background pass',
    });
    this.watching = new PluginBackground({
      ...services,
      kind: 'watch',
      projectRemoved: () => {},
    });
  }

  syncProjects(projectIds: string[]): void {
    this.background.syncProjects(projectIds);
    this.watching.syncProjects(projectIds);
  }

  close(): void {
    this.background.close();
    this.watching.close();
  }
}
