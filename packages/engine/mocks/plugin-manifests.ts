import { rejectedCapabilities } from './plugin-capability-manifests';

// The valid manifest the fixtures below patch, and the one every fixture Plugin folder is written from.
// It is its own fixture so that editing a shipped Plugin's manifest cannot change what these tests mean.
export const manifestTemplate = {
  id: 'fixture-plugin',
  name: 'Fixture Plugin',
  version: '1.0.0',
  engines: { argo: '^1.0.0' },
  main: 'index.js',
  icon: { sf: 'ticket', sfFilled: 'ticket.fill' },
  contributes: {
    nav: [
      { id: 'issues', title: 'Issues', path: '/issues' },
      { id: 'plans', title: 'Plans', path: '/plans' },
    ],
  },
};

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
    reason: 'expected object, received string',
  },
  {
    folder: 'filled-without-sf',
    patch: { icon: { sfFilled: 'ticket.fill', material: 'power' } },
    reason: 'icon.sfFilled needs an sf name',
  },
  {
    folder: 'newer-sf-symbol',
    patch: { icon: { sf: '1.calendar' } },
    reason: '1.calendar is not in SF Symbols 6.0',
  },
  {
    folder: 'unknown-sf-symbol',
    patch: { icon: { sf: 'not.a.symbol', material: 'power' } },
    reason: 'not.a.symbol is not in SF Symbols 6.0',
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
    folder: 'duplicate-setting',
    patch: {
      contributes: {
        nav: [],
        settings: [
          { key: 'host', type: 'text', label: 'Host' },
          { key: 'host', type: 'toggle', label: 'Host again' },
        ],
      },
    },
    reason: 'Setting keys must be unique',
  },
  {
    folder: 'unlisted-picker-default',
    patch: {
      contributes: {
        nav: [],
        settings: [
          {
            key: 'sort',
            type: 'picker',
            label: 'Sort by',
            options: [{ value: 'updated', label: 'Recently updated' }],
            default: 'stars',
          },
        ],
      },
    },
    reason: 'A picker default must be one of its options',
  },
  {
    folder: 'unknown-setting-type',
    patch: {
      contributes: {
        nav: [],
        settings: [{ key: 'count', type: 'number', label: 'Count' }],
      },
    },
    reason: 'settings',
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
  ...rejectedCapabilities,
];
