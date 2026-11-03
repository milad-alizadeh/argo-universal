export { startPluginTest } from './host';

export type { PluginTest, PluginTestOptions } from './host';

export { PluginTestView } from './view';

export { test, collectPluginTests, type PluginTestCase } from './test-cases';

// What a Plugin's own tests read in the trees and Slot items the harness hands back.
export {
  Action,
  projectDetailsSlotId,
  type ProjectDetailsItem,
  type WireNode,
} from '@repo/contracts/plugins/wire';

export { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';

// Whether a page drew nothing, as Argo reads it: a Workbench card whose page draws nothing is not drawn.
export { drawsNothing } from '@repo/contracts/plugins/wire-empty-page';

export {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from './fixture-services';
