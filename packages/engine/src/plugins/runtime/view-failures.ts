import type { OpenView } from '../views/open-view';
import { openingKey } from '../views/opening-key';
import type { PluginIdentity } from './drawing-failures';
import type { PluginFailures } from './failures';

type Identities = (pluginId: string) => PluginIdentity | undefined;

/*
 * What a view's drawing does to its Plugin's failures. Every one of them is keyed by the Opening the view
 * belongs to, so a failure outlives the view that raised it and the viewId a Plugin reload mints.
 */
export class ViewFailures {
  public constructor(
    private readonly failures: PluginFailures,
    private readonly identity: Identities,
  ) {}

  public failed(view: OpenView, message: string): void {
    const plugin = this.identity(view.pluginId);

    if (plugin) this.failures.drawing(plugin, openingKey(view), message);
  }

  public drew(view: OpenView): void {
    this.failures.cleared(openingKey(view));
  }

  // The App has stopped asking for this Opening, so the failure it was shown for goes with it.
  public released(view: OpenView, lastOfOpening: boolean): void {
    if (lastOfOpening) this.failures.cleared(openingKey(view));
  }
}
