export { startPluginTest } from './host';

export type { PluginTest, PluginTestOptions } from './host';

export type { PageOpening } from './page-server';

export type { PageView } from './page-view';

export { test, collectPluginTests, type PluginTestCase } from './test-cases';

// What a Plugin's own tests read in the trees and Slot items the harness hands back.
export {
  Action,
  projectDetailsSlotId,
  type ProjectDetailsItem,
  type WireNode,
} from '@repo/contracts/plugins/wire';

export { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';
