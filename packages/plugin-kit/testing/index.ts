export { startPluginTest } from './host';

export type { PluginTest, PluginTestOptions } from './host';

// A secret store to share between two starts of a Plugin, so a restart keeps its Accounts' tokens.
export { MemorySecretStore } from '@repo/engine/mocks/secret-store';

export type { PageOpening } from './page-server';

export type { OpenPage } from './open-page';

export { test, collectPluginTests, type PluginTestCase } from './test-cases';

// What a Plugin's own tests read in the trees and Slot items the harness hands back.
export {
  Action,
  projectDetailsSlotId,
  type ProjectDetailsItem,
  type WireNode,
} from '@repo/contracts/plugins/wire';

// Whether a page's answer is the empty root, which a Workbench card of it is not drawn for.
export { drawsNothing } from '@repo/contracts/plugins/wire-empty-page';

export { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';

export {
  fixtureServices,
  type FixtureAnswer,
  type FixtureRequest,
  type FixtureServices,
} from './fixture-services';
