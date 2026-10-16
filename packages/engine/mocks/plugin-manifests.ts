// Malformed manifest data, supplied through real Plugin folders to the Engine journey.
export const rejectedManifests = [
  { folder: 'missing-id', patch: { id: undefined }, reason: 'id' },
  { folder: 'missing-name', patch: { name: '' }, reason: 'name' },
  {
    folder: 'invalid-version',
    patch: { version: 'later' },
    reason: 'version must be a semver',
  },
  {
    folder: 'invalid-range',
    patch: { engines: { argo: 'later' } },
    reason: 'engines.argo must be',
  },
  {
    folder: 'wildcard',
    patch: { engines: { argo: '*' } },
    reason: 'never be *',
  },
  {
    folder: 'wildcard-alternative',
    patch: { engines: { argo: '^1 || *' } },
    reason: 'never be *',
  },
  {
    folder: 'future',
    patch: { engines: { argo: '^99' } },
    reason: 'Requires Argo ^99',
  },
  {
    folder: 'unknown-icon',
    patch: { icon: 'not-an-argo-icon' },
    reason: 'icon',
  },
  {
    folder: 'outside-main',
    patch: { main: '../workspace/src/index.ts' },
    reason: 'main',
  },
  {
    folder: 'invalid-nav',
    patch: {
      contributes: { nav: [{ id: 'bad', title: 'Bad', path: '../sessions' }] },
    },
    reason: 'path',
  },
  {
    folder: 'duplicate-nav',
    patch: {
      contributes: {
        nav: [
          { id: 'same', title: 'One', path: '/' },
          { id: 'same', title: 'Two', path: '/two' },
        ],
      },
    },
    reason: 'Nav ids must be unique',
  },
  { folder: 'unknown-field', patch: { unknown: true }, reason: 'unknown' },
];
