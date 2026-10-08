import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { buildHoistingReport } from './hoist-check/report.mts';
import { workspace } from './hoist-check/workspace-mock.ts';

it('counts distinct production consumers through renamed barrel exports', (): void => {
  const root = workspace({
    'packages/client/package.json':
      '{"name":"@repo/client","exports":"./src/index.ts"}',
    'packages/client/src/lib/format.ts':
      'export const format = () => "formatted";',
    'packages/client/src/index.ts':
      'export { format as display } from "./lib/format";',
    'apps/one/src/view.ts':
      'import { display } from "@repo/client"; import { display as again } from "@repo/client";',
    'apps/two/src/view.ts': 'import { display } from "@repo/client";',
    'apps/one/src/view.test.ts': 'import { display } from "@repo/client";',
  });
  const report = buildHoistingReport(root);
  expect(report).toContain(
    'packages/client/src/lib/format.ts [generic]: 2 production',
  );
  expect(report).toContain('1 test; TWO consumers: wait for the third');
});

it('reports generic imports that reach product code', (): void => {
  const root = workspace({
    'packages/client/package.json':
      '{"name":"@repo/client","imports":{"#feed/*":"./src/feed/*.ts"}}',
    'packages/client/src/lib/reader.ts':
      'import type { FeedEntry } from "#feed/entry"; export const readFeed = () => undefined;',
    'packages/client/src/feed/entry.ts': 'export interface FeedEntry {}',
    'GLOSSARY.md': '**Feed**:\nThe Session updates.\n**Turn**:\nOne prompt.',
  });
  const report = buildHoistingReport(root);
  expect(report).toContain(
    'reader.ts -> #feed/entry (packages/client/src/feed/entry.ts, product package, type-only)',
  );
  expect(report).toContain('readFeed names feed');
  expect(report).toContain('Shell and Turn have UI homonyms');
});

it('separates shared package consumers from local component consumers', (): void => {
  const root = workspace({
    'packages/client/package.json': '{"name":"@repo/client"}',
    'packages/client/src/components/card.ts': 'export const Card = "card";',
    'packages/client/src/screens/home.ts':
      'import { Card } from "../components/card";',
    'packages/client/src/primitives/button.ts':
      'export const Button = "button";',
    'packages/machine-log/package.json':
      '{"name":"@repo/machine-log","exports":"./src/browser.ts"}',
    'packages/machine-log/src/browser.ts':
      'export const log = () => undefined;',
    'packages/machine-log/src/browser.native.ts':
      'export const log = () => undefined;',
    'packages/contracts/package.json':
      '{"name":"@repo/contracts","exports":"./src/value.ts"}',
    'packages/contracts/src/value.ts': 'export const Value = "value";',
    'apps/one/src/view.ts':
      'import { log } from "@repo/machine-log"; import { Value } from "@repo/contracts";',
  });
  const report = buildHoistingReport(root);
  expect(report).toContain(
    'browser.native.ts: 1 production outside @repo/machine-log',
  );
  expect(report).toContain('primitives: 1 modules; 0 consumers: 1, 1: 0, 2: 0');
  expect(report).toContain('consumer in screens/: 1');
  expect(report).toContain(
    '@repo/contracts: 1 modules; reached from another package by 1 file: 1, by 2: 0, by 3+: 0',
  );
});

it('follows namespace imports through star barrels', (): void => {
  const root = workspace({
    'packages/client/package.json':
      '{"name":"@repo/client","exports":"./src/index.ts"}',
    'packages/client/src/lib/format.ts':
      'export const format = (source) => Array.from(source);',
    'packages/client/src/index.ts': 'export * from "./lib/format";',
    'apps/one/src/view.ts': 'import * as display from "@repo/client";',
  });
  expect(buildHoistingReport(root)).toContain(
    'packages/client/src/lib/format.ts [generic]: 1 production',
  );
});

it('keeps the command successful when the report identifies misplaced helpers', (): void => {
  const root = workspace({
    'packages/client/src/lib/lone.ts': 'export const lone = 1;',
  });
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL('./hoist-check.mts', import.meta.url)), root],
    { encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('NO production consumer');
});

it('reports an unreadable workspace without failing the command', (): void => {
  const root = workspace({});
  const result = spawnSync(
    process.execPath,
    [
      fileURLToPath(new URL('./hoist-check.mts', import.meta.url)),
      join(root, 'missing'),
    ],
    { encoding: 'utf8' },
  );
  expect(result.status).toBe(0);
  expect(result.stderr).toContain('hoist-check: could not read the workspace');
});

it('counts only the selected declaration in an inline import type', (): void => {
  const root = workspace({
    'packages/contracts/package.json':
      '{"name":"@repo/contracts","exports":"./src/index.ts"}',
    'packages/contracts/src/index.ts':
      'export { Row } from "./row"; export { Page } from "./page";',
    'packages/contracts/src/row.ts': 'export interface Row {}',
    'packages/contracts/src/page.ts': 'export interface Page {}',
    'apps/one/src/view.ts': 'export type View = import("@repo/contracts").Row;',
  });
  expect(buildHoistingReport(root)).toContain(
    '@repo/contracts: 3 modules; reached from another package by 1 file: 2, by 2: 0, by 3+: 0',
  );
});
