// Owner-approved folder moves (ADR-0017). Each new folder keeps the historical waiver identity of the folders listed for it.
const engineRelocations: [string, string[]][] = [
  ['mocks/app/*', ['packages/api/mocks/*']],
  ['packages/engine/mocks/*', ['apps/server/mocks/*']],
  ['packages/engine/src/engine/*', ['apps/server/src/engine/*']],
  [
    'packages/engine/src/storage/*',
    ['packages/engine/src/services/feed/*', 'apps/server/src/services/feed/*'],
  ],
  // Spec 0011 #451: services/<x> flattens to src/<x>; the Session read models split into sessions/list.
  ...['agents', 'blob', 'feed', 'projects', 'sessions', 'system'].map(
    (module): [string, string[]] => [
      `packages/engine/src/${module}/*`,
      [
        `packages/engine/src/services/${module}/*`,
        `apps/server/src/services/${module}/*`,
      ],
    ],
  ),
  [
    'packages/engine/src/sessions/list/*',
    [
      'packages/engine/src/services/sessions/*',
      'apps/server/src/services/sessions/*',
    ],
  ],
];

const client = (folder: string): string => `packages/client/src/${folder}/*`;
const components = client('components');
const screens = client('screens');

// Spec 0011 #437: the client splits into feature folders and lib/{product,generic}.
const clientRelocations: [string, string[]][] = [
  ['packages/client/src/*', [client('trpc')]],
  [client('features/composer/components'), [components]],
  [client('features/composer/hooks'), [components, screens]],
  [client('features/composer/state'), [screens]],
  [client('features/connection/components'), [components]],
  [client('features/connection/screens'), [screens]],
  [client('features/connection/state'), [client('connection')]],
  [client('features/connection/trpc'), [client('trpc')]],
  [client('features/feed/components'), [components]],
  [client('features/feed/hooks'), [client('feed')]],
  [client('features/feed/view'), [client('feed')]],
  [client('features/frame/components'), [components]],
  [client('features/frame/hooks'), [components]],
  [client('features/frame/screens'), [screens]],
  [client('features/requests/components'), [components]],
  [client('features/sessions/components'), [components]],
  [client('features/sessions/screens'), [screens]],
  [client('features/settings/components'), [components]],
  [client('lib/generic'), [client('lib'), client('navigation')]],
  [client('lib/generic/primitives'), [components, client('primitives')]],
  [client('lib/generic/symbols'), [client('lib')]],
  [client('lib/product'), [components, screens]],
  [client('lib/product/markdown'), [components]],
  [client('lib/product/navigation'), [client('navigation')]],
];

export const relocatedFolders = new Map([
  ...engineRelocations,
  ...clientRelocations,
]);
