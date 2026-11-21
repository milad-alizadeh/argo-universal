import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { PluginManifest } from '@repo/contracts/plugins';
import type { BuildResult } from 'esbuild';
import { bundlePlugin } from '../dev/bundle';
import { readManifest } from '../discovery/manifest';
import { readIconMarkup } from '../discovery/manifest-icon';
import { runtimeError } from '../protocol/runtime';
import { BuildError, buildDiagnostics } from './build-diagnostics';
import type { PluginDiagnostic } from './diagnostics';
import { draftManifestDiagnostics, inspectDraftLoaders } from './drafts';
import { inspectGlobals } from './globals';
import { manifestDiagnostics } from './manifest-diagnostics';
import {
  emptySourceReport,
  inspectSource,
  type PluginSourceReport,
} from './source';

// `shipBlockers` are what keeps a valid Plugin from shipping, the Variants a Draft still declares.
export type PluginValidation = PluginSourceReport & {
  manifest?: PluginManifest;
  shipBlockers: PluginDiagnostic[];
};

type ManifestReport = PluginValidation & { manifest: PluginManifest };

export async function validatePlugin(
  directory: string,
  version = '0.0.0',
): Promise<PluginValidation> {
  const report: PluginValidation = {
    ...emptySourceReport(),
    shipBlockers: [],
  };

  const manifest = await checkedManifest({ directory, version }, report);

  if (!manifest) return report;
  report.manifest = manifest;

  const drafts = await draftManifestDiagnostics(directory, manifest);

  report.diagnostics.push(...drafts.diagnostics);
  report.shipBlockers.push(...drafts.shipBlockers);
  await inspectEntry(directory, { ...report, manifest });

  return report;
}

// The manifest, and its icon file read as the Server reads it when it loads the Plugin (ADR-0058).
async function iconCheckedManifest(input: {
  directory: string;
  version: string;
}): Promise<PluginManifest> {
  const manifest = await readManifest(input.directory, input.version);

  await readIconMarkup(input.directory, manifest.icon);

  return manifest;
}

async function checkedManifest(
  input: { directory: string; version: string },
  report: PluginValidation,
): Promise<PluginManifest | undefined> {
  try {
    return await iconCheckedManifest(input);
  } catch (error) {
    const cause =
      error instanceof Error ? error : new Error(runtimeError(error));

    report.diagnostics.push(
      ...(await manifestDiagnostics(input.directory, cause)),
    );

    return undefined;
  }
}

async function inspectEntry(
  directory: string,
  report: ManifestReport,
): Promise<void> {
  const entry = { directory, main: report.manifest.main };

  try {
    await inspectBundle(entry, report);
  } catch (error) {
    const parsed = BuildError.safeParse(error);

    const fallback = basicDiagnostic(entry, runtimeError(error));

    report.diagnostics.push(
      ...(parsed.success ? buildDiagnostics(entry, parsed.data) : [fallback]),
    );
  }
}

async function inspectBundle(
  entry: { directory: string; main: string },
  report: ManifestReport,
): Promise<void> {
  const bundle = await bundlePlugin(entry);

  for (const file of inputsOf(bundle))
    await inspectFile(entry.directory, file, report);
}

type SourceInput = { path: string; commonJs: boolean };

function inputsOf(bundle: BuildResult): SourceInput[] {
  return Object.entries(bundle.metafile?.inputs ?? {})
    .filter(([path]) => path !== '<stdin>')
    .map(([path, input]) => ({ path, commonJs: input.format === 'cjs' }));
}

async function inspectFile(
  directory: string,
  file: SourceInput,
  report: ManifestReport,
): Promise<void> {
  if (file.path.endsWith('.json')) return;
  const path = resolve(directory, file.path);

  const input = {
    file: path,
    source: await readFile(path, 'utf8'),
    commonJs: file.commonJs,
  };

  addSourceReport(report, inspectSource(input, report.manifest));
  report.diagnostics.push(...inspectDraftLoaders(input, report.manifest));
  report.diagnostics.push(...(await inspectGlobals(input)));
}

function addSourceReport(
  report: PluginValidation,
  inspected: PluginSourceReport,
): void {
  for (const key of ['calls', 'hooks', 'slots'] as const)
    report[key].push(...inspected[key]);
  report.diagnostics.push(...inspected.diagnostics);
}

function basicDiagnostic(
  entry: { directory: string; main: string },
  message: string,
): PluginDiagnostic {
  return {
    file: join(entry.directory, entry.main),
    line: 1,
    column: 1,
    message,
  };
}
