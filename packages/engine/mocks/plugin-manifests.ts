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
    folder: 'unbounded',
    patch: { engines: { argo: '>=0' } },
    reason: 'no upper bound',
  },
  {
    folder: 'future',
    patch: { engines: { argo: '^99' } },
    reason: 'Requires Argo ^99',
  },
  {
    folder: 'too-old',
    patch: { engines: { argo: '<1.0.0' } },
    reason: 'which is newer',
  },
  {
    folder: 'missing-main',
    patch: {},
    reason: 'main file index.js is missing',
  },
  { folder: 'empty-icon', patch: { icon: {} }, reason: 'icon needs an sf' },
  {
    folder: 'argo-icon-name',
    patch: { icon: 'plug' },
    reason: 'icon',
  },
  {
    folder: 'unknown-sf-symbol',
    patch: { icon: { sf: 'not.a.symbol', material: 'power' } },
    reason: 'not.a.symbol is not in SF Symbols',
  },
  {
    folder: 'unknown-material-symbol',
    patch: { icon: { material: 'not_a_symbol' } },
    reason: 'not_a_symbol is not in Material Symbols',
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
