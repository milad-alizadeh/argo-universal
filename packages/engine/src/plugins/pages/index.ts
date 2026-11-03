/*
 * Loader pages (ADR-0050): a page is a Loader and a pure Render, drawn once per Page address.
 *
 * `draw(request)` starts the Plugin when it is not running, runs the Loader the address's path matches,
 * reads `pages` pages of its paged list, then runs its Render, and answers the Plugin tree, parsed,
 * capped, sanitised and prepared as every Plugin tree is. When the request names the hash of the tree the
 * App keeps, the answer is `unchanged` for the same tree, or `append` for a tree this Server sent that
 * the new one only grows by appended rows, and otherwise the whole `tree`. Two draws of one address may
 * run at once. It answers `failed` when the Plugin cannot start, no pattern matches the path, the Loader
 * throws or takes longer than 30 seconds, the Render calls a hook or passes a function prop, or the tree
 * is invalid or too large. It never throws.
 *
 * `run(call)` runs one of the Plugin's declared Operations through the ADR-0044 registry's checks (the
 * manifest's params and tier, a running worker) and answers its result with the Page path patterns the
 * App draws again. It throws what the Operation throws, so the App rolls back and says why.
 *
 * `stale(signal)` streams a stale mark after every Operation of a Plugin that answered, whoever ran it
 * (a Component event, an Agent, the CLI), until the signal aborts or `close()`; the App draws again only
 * the addresses it has on screen, so no App polls.
 *
 * `patterns(pluginId)` lists the Page path patterns the running Plugin defined, so the App knows which
 * of its paths are Loader pages; it starts the Plugin first and throws when it cannot.
 */
export { LoaderPages, type PagesHost } from './loader-pages';

export { PluginDraws } from './plugin-draws';
