/*
 * The `argo` calls the runtime answers itself: pages, Hooks, dispatch results, Queries, badges, Slot
 * items, a Plugin's answers to its own Operations and its Loader pages' draws. PluginServices answers every other call.
 */
export type RuntimeApiName =
  | 'view'
  | 'hooks'
  | 'dispatchResult'
  | 'data'
  | 'nav'
  | 'slots'
  | 'operations'
  | 'pages';
