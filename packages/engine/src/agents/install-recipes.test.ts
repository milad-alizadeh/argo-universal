import type { ACPAgent } from '@repo/contracts';
import { expect, it } from 'vitest';
import { resolveInstallRecipe } from './install/recipe';
const packageName = 'example-agent';
const entry: ACPAgent = {
  id: packageName,
  name: 'Example Agent',
  description: 'Pinned package fixture',
  version: '1.2.3',
  license_url: 'https://example.org/license',
  distribution: { npx: { package: packageName } },
};
it.each([
  {
    kind: 'npx',
    package: '@example/agent',
    pinned: '@example/agent@1.2.3',
    version: '1.2.3',
  },
  {
    kind: 'uvx',
    package: packageName,
    pinned: 'example-agent==1.2.3',
    version: '1.2.3',
  },
  {
    kind: 'uvx',
    package: 'minion-code@0.1.44',
    pinned: 'minion-code==0.1.44',
    version: '0.1.44',
  },
] as const)(
  'pins the $kind package to the selected Registry release',
  (fixture) => {
    expect(
      resolveInstallRecipe(entry, {
        kind: fixture.kind,
        recipe: { package: fixture.package },
      }),
    ).toMatchObject({ package: fixture.pinned, version: fixture.version });
  },
);
it.each([
  { kind: 'npx', package: 'example-agent@1.2.3+build.1' },
  { kind: 'uvx', package: 'example-agent==1.2' },
  { kind: 'uvx', package: 'example-agent==1.2.3b1' },
  { kind: 'uvx', package: 'example-agent==1.2.3.post1' },
  { kind: 'uvx', package: 'example-agent==1.2.3.dev1' },
  { kind: 'uvx', package: 'example-agent==1!1.2.3' },
  { kind: 'uvx', package: 'example-agent==1.2.3+local.1' },
] as const)('accepts pinned ecosystem version $package', (fixture) => {
  expect(
    resolveInstallRecipe(entry, {
      kind: fixture.kind,
      recipe: { package: fixture.package },
    }),
  ).toMatchObject({ package: fixture.package });
});
it.each([
  'example-agent@latest',
  'example-agent==1.2.*',
  'example-agent>=1.2',
  'example-agent==1.2.3+',
  'example-agent==1.2.3+local+extra',
  'example-agent @ https://example.org/package.whl',
  'https://example.org/package.whl',
])('rejects unpinned or injected Python recipe %s', (packageName) => {
  expect(() =>
    resolveInstallRecipe(entry, {
      kind: 'uvx',
      recipe: { package: packageName },
    }),
  ).toThrow(/Registry package/);
});
it.each([
  'example-agent@latest',
  'example-agent@^1.2.3',
  'example-agent@file:local',
  'https://example.org/package.tgz',
])('rejects unpinned or injected npm recipe %s', (packageName) => {
  expect(() =>
    resolveInstallRecipe(entry, {
      kind: 'npx',
      recipe: { package: packageName },
    }),
  ).toThrow(/Registry package/);
});
