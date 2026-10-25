import { resolve } from 'node:path';
import { validatePlugin } from '@repo/engine/plugin-validation';
import { readPluginManifest } from '@repo/engine/plugins';
import { z } from 'zod';
import {
  startPluginTest,
  type PluginTest,
  type PluginTestCase,
} from '../testing';
import { withinPluginTestBudget } from './plugin-test-budget';
import { loadPluginTests, pluginTestFiles } from './plugin-test-files';

type Write = (line: string) => void;

const PluginArguments = z.tuple([
  z.enum(['validate', 'test']),
  z.string().min(1),
]);

const commands = { validate, test: runTests };

// `name` is how the caller is run: `argo-plugin` from the kit, `argo plugin` from the Server.
export function runPluginCommand(
  args: string[],
  write: Write,
  name: string,
): Promise<number> {
  const parsed = PluginArguments.safeParse(args);

  if (!parsed.success) {
    write(`Usage: ${name} <validate|test> <dir>`);

    return Promise.resolve(1);
  }

  return runCommand(parsed.data, write);
}

async function runCommand(
  [command, directory]: z.infer<typeof PluginArguments>,
  write: Write,
): Promise<number> {
  try {
    return await commands[command](resolve(directory), write);
  } catch (error) {
    write(String(error));

    return 1;
  }
}

async function validate(directory: string, write: Write): Promise<number> {
  const report = await validatePlugin(directory);
  writeReport(report, write);

  return Number(report.diagnostics.length > 0);
}

function writeReport(
  report: Awaited<ReturnType<typeof validatePlugin>>,
  write: Write,
): void {
  for (const key of ['hooks', 'calls', 'slots'] as const)
    write(`${key}: ${formatUses(report[key])}`);
  writeOrder(report.manifest, write);

  for (const diagnostic of report.diagnostics)
    write(
      `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}: ${diagnostic.message}`,
    );
  write(validationMessage(report.diagnostics.length));
}

type ValidatedManifest = Awaited<ReturnType<typeof validatePlugin>>['manifest'];

function writeOrder(manifest: ValidatedManifest, write: Write): void {
  if (manifest && ordersSlots(manifest)) writeDeclaredOrder(manifest, write);
}

// `order` places a Plugin among Slot contributors and in `ui.render` chains, so it shows for either.
const ordersSlots = ({
  contributes,
}: NonNullable<ValidatedManifest>): boolean =>
  [contributes.slots, contributes.renders].some((ids) => Boolean(ids?.length));

function writeDeclaredOrder(
  { contributes }: NonNullable<ValidatedManifest>,
  write: Write,
): void {
  write(`order: ${contributes.order ?? 0}`);
}

function formatUses(uses: string[]): string {
  return [...new Set(uses)].join(', ') || '(none)';
}

function validationMessage(count: number): string {
  return count ? `Plugin validation failed (${count})` : 'Plugin is valid';
}

type TestRun = { directory: string; pluginId: string; write: Write };

async function runTests(directory: string, write: Write): Promise<number> {
  const manifest = await readPluginManifest(directory, '0.0.0');
  const files = await requireTestFiles(directory);
  const input = { directory, pluginId: manifest.id, write };
  let failures = 0;

  for (const file of files)
    for (const test of await requireTests(file))
      failures += await runTest(input, test);

  return Number(failures > 0);
}

async function requireTestFiles(directory: string): Promise<string[]> {
  const files = await pluginTestFiles(directory);

  if (!files.length) throw new Error('No Plugin tests found');

  return files;
}

async function runTest(input: TestRun, test: PluginTestCase): Promise<number> {
  const kit = await startTest(input);

  try {
    await withinPluginTestBudget(Promise.resolve(test.run(kit)));
    input.write(`PASS ${test.name}`);

    return 0;
  } catch (error) {
    input.write(`FAIL ${test.name}: ${String(error)}`);

    return 1;
  } finally {
    await kit.close();
  }
}

function startTest(input: TestRun): Promise<PluginTest> {
  return startPluginTest({
    directory: input.directory,
    pluginId: input.pluginId,
    version: '0.0.0',
    clockStart: 0,
  });
}

async function requireTests(file: string): Promise<PluginTestCase[]> {
  const tests = await loadPluginTests(file);

  if (!tests.length) throw new Error(`No Plugin tests registered in ${file}`);

  return tests;
}
