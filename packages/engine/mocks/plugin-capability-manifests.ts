const processExec = 'process:exec';

export const rejectedCapabilities = [
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
