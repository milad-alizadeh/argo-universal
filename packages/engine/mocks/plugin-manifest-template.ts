import { PluginManifest } from '@repo/contracts/plugins';

/*
 * The valid manifest the rejected fixtures patch, and the one every fixture Plugin folder is written
 * from. It is its own fixture so that editing a shipped Plugin's manifest cannot change these tests.
 */
export const manifestTemplate = PluginManifest.parse({
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
});
