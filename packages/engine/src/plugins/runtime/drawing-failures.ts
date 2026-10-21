import { randomUUID } from 'node:crypto';
import { PluginFailure } from '@repo/contracts/plugins/runtime';
import type { z } from 'zod';

export type PluginIdentity = Pick<
  z.input<typeof PluginFailure>,
  'pluginId' | 'name'
>;

/*
 * Drawing failures, one per Opening: a Plugin that throws fails what the App asked for and nothing else,
 * so another view of the same Plugin neither clears it nor is cleared by it (ADR-0037).
 */
export class DrawingFailures {
  private readonly byOpening = new Map<string, PluginFailure>();

  // The App shows one toast per Plugin, so several failed Openings roll up to the Plugin's latest.
  public rollup(): PluginFailure[] {
    const latest = new Map<string, PluginFailure>();

    for (const failure of this.byOpening.values())
      latest.set(failure.pluginId, failure);

    return [...latest.values()];
  }

  // The same message on the same Opening is not news; anything else is.
  public failed(
    plugin: PluginIdentity,
    opening: string,
    message: string,
  ): boolean {
    if (this.byOpening.get(opening)?.message === message) return false;
    this.byOpening.set(opening, createDrawingFailure(plugin, message));

    return true;
  }

  public cleared(opening: string): boolean {
    return this.byOpening.delete(opening);
  }

  public end(pluginId: string): boolean {
    const gone = this.openingsOf(pluginId);

    for (const opening of gone) this.byOpening.delete(opening);

    return gone.length > 0;
  }

  private openingsOf(pluginId: string): string[] {
    return this.byOpening
      .entries()
      .filter(([, failure]) => failure.pluginId === pluginId)
      .map(([opening]) => opening)
      .toArray();
  }
}

function createDrawingFailure(
  plugin: PluginIdentity,
  message: string,
): PluginFailure {
  return PluginFailure.parse({
    ...plugin,
    kind: 'drawing',
    message,
    key: randomUUID(),
  });
}
