/*
 * Loader pages (ADR-0050): a page is a Loader and a pure Render, drawn once per Page address.
 *
 * `draw(address)` starts the Plugin when it is not running, runs the Loader the address's path matches
 * and then its Render, and answers the Plugin tree, parsed, capped, sanitised and prepared as every
 * Plugin tree is. It holds nothing between draws: the same address draws again from fresh reads, and
 * two draws of one address may run at once. It answers `{ ok: false }` when the Plugin cannot start, no
 * pattern matches the path, the Loader throws or takes longer than 30 seconds, the Render calls a hook
 * or passes a function prop, or the tree is invalid or too large. It never throws.
 *
 * `run(call)` runs one of the Plugin's declared Operations through the ADR-0044 registry's checks (the
 * manifest's params and tier, a running worker) and answers its result with the Page path patterns the
 * App draws again. It throws what the Operation throws, so the App rolls back and says why.
 *
 * `patterns(pluginId)` lists the Page path patterns the running Plugin defined, so the App knows which
 * of its paths are Loader pages; it starts the Plugin first and throws when it cannot.
 */
export { LoaderPages, type PageAnswer, type PagesHost } from './loader-pages';

export { PluginDraws } from './plugin-draws';
