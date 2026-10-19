const processExec = 'process:exec';

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
  ...(
    [
      ['raw-ip-host', '127.0.0.2'],
      ['raw-ipv6-host', '[::1]'],
      ['localhost-host', 'localhost'],
      ['localhost-port-host', 'localhost:8080'],
      ['wildcard-host', '*'],
    ] satisfies [string, string][]
  ).map(([folder, host]) => ({
    folder,
    patch: { capabilities: [{ kind: 'fetch', host }] },
    reason: 'needs a reason',
  })),
  ...(
    [
      ['host-with-scheme', 'https://api.github.com'],
      ['host-with-path', 'api.github.com/repos'],
      ['host-not-normal', 'API.github.com'],
      ['host-numeric-ip', '2130706433'],
    ] satisfies [string, string][]
  ).map(([folder, host]) => ({
    folder,
    patch: { capabilities: [{ kind: 'fetch', host, reason: 'testing' }] },
    reason: 'host must be',
  })),
  ...(
    [
      ['ld-env', 'LD_PRELOAD'],
      ['dyld-env', 'DYLD_INSERT_LIBRARIES'],
      ['node-options-env', 'NODE_OPTIONS'],
      ['git-config-env', 'GIT_CONFIG_COUNT'],
      ['path-env', 'PATH'],
    ] satisfies [string, string][]
  ).map(([folder, name]) => ({
    folder,
    patch: {
      capabilities: [
        { kind: processExec, command: 'gh', args: ['**'], env: [name] },
      ],
    },
    reason: `${name} is never allowed`,
  })),
  {
    folder: 'relative-command',
    patch: {
      capabilities: [{ kind: processExec, command: './gh', args: [] }],
    },
    reason: 'command must be',
  },
  {
    folder: 'inner-wildcard',
    patch: {
      capabilities: [{ kind: processExec, command: 'gh', args: ['--repo=*'] }],
    },
    reason: 'args pattern',
  },
  {
    folder: 'rest-not-last',
    patch: {
      capabilities: [
        { kind: processExec, command: 'gh', args: ['**', 'list'] },
      ],
    },
    reason: '** must be the last',
  },
  {
    folder: 'unknown-capability',
    patch: { capabilities: [{ kind: 'fs:write', path: '/' }] },
    reason: 'kind',
  },
];
