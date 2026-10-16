import { fileURLToPath } from 'node:url';

// The Server runs from apps/server, so Argo's shipped Plugins sit in the repository's `plugins/`; a packaged Server will resolve its resources folder here instead.
export const firstPartyPluginsDirectory = fileURLToPath(
  new URL('../../../../plugins', import.meta.url),
);
