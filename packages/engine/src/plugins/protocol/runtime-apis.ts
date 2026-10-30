/*
 * The `argo` calls the runtime answers itself: pages, Hooks, dispatch results, Queries, badges, Slot
 * items and a Plugin's answers to its own Operations. PluginServices answers every other call.
 */
export type RuntimeApiName =
  | 'view'
  | 'hooks'
  | 'dispatchResult'
  | 'data'
  | 'nav'
  | 'slots'
  | 'operations';
