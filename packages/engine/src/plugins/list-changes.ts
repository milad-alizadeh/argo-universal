import type { PluginListChange } from '@repo/contracts/plugins/runtime';
import { Broadcast } from './broadcast';

/*
 * Tells every connected App that the Server's Plugin list changed. A Plugin can be turned off from
 * another App, so an App that is drawing its page learns of the stop here rather than carrying on.
 */
export class PluginListChanges extends Broadcast<PluginListChange> {
  public changed(pluginId: string): void {
    this.send({ pluginId });
  }
}
