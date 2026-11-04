/*
 * Loader pages (ADR-0050): a page is a Loader and a pure Render, drawn once per Page address.
 *
 * `draw(request, drawnFor)` starts the Plugin when it is not running, runs the Loader the address's path
 * matches, with a context that names the asking Connection's surface and whether it is the Server Device,
 * reads `pages` pages of its paged list, then runs its Render, and answers the Plugin tree, parsed,
 * capped, sanitised and prepared as every Plugin tree is; the log names the SVG it left out. When the request names the hash of the tree the
 * App keeps, the answer is `unchanged` for the same tree, or `append` when the App keeps the tree this
 * Server last sent for the address and the new one only grows it by appended rows, and otherwise the whole
 * `tree`. The Server keeps that last tree per address while the Plugin's generation runs. Two draws of one address may
 * run at once. It answers `failed` when the Plugin cannot start, no pattern matches the path, the Loader
 * throws or takes longer than 30 seconds, the Render calls a hook or passes a function prop, or the tree
 * is invalid or too large. It never throws. Each answer carries the page's clamped `every`, and a timed
 * redraw reads again the Queries older than it; a Live page's draw answers its first value and `live`.
 *
 * `live(request, asking, signal)` follows a Live page: the first tree whole (or `unchanged`), then one
 * keyed patch a frame from the tree sent before, until the signal aborts, the Loader ends or fails, or
 * the Plugin's generation ends; it then stops the Loader.
 *
 * `run(call)` runs one of the Plugin's declared Operations through the ADR-0044 registry's checks (the
 * manifest's params and tier, a running worker) and answers its result. It throws what the Operation
 * throws, so the App rolls back and says why.
 *
 * `stale(signal)` streams a stale mark after every Operation of a Plugin that answered, whoever ran it
 * (a Component event, an Agent, the CLI), and after each `argo.changed()` outside one, naming no address,
 * so every one of the Plugin's is stale; one Operation makes one mark, however often its handler says
 * `argo.changed()`. A Query answer that changed with no write marks the addresses whose last draw read
 * it. It runs until the signal aborts or `close()`; the App draws again only the addresses it has on
 * screen, so no App polls.
 *
 * `patterns(pluginId)` lists the Page path patterns the running Plugin defined, so the App knows which
 * of its paths are Loader pages; it starts the Plugin first and throws when it cannot.
 */
export { LoaderPages, type Asking } from './loader-pages';

export { PluginDraws } from './plugin-draws';
