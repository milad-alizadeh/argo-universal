import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PluginManifest } from '@repo/contracts/plugins';
import { draftPages, missingDraftStates } from '@repo/contracts/plugins/drafts';
import { findNodeAtLocation, parseTree } from 'jsonc-parser';
import {
  sourceDiagnostic,
  type PluginDiagnostic,
  type SourceFile,
} from './diagnostics';

// `argo plugin validate` on Drafts (ADR-0057): each Draft page declares the minimum states, and no Variant ships.

// Where `path` under `contributes.drafts` starts in plugin.json, or 0 when the file has no such node.
function draftOffset(
  manifest: SourceFile,
  path: readonly (string | number)[],
): number {
  const tree = parseTree(manifest.source, [], { disallowComments: true });

  const node =
    tree && findNodeAtLocation(tree, ['contributes', 'drafts', ...path]);

  return node?.offset ?? 0;
}

// The minimum states each Draft page leaves out, one diagnostic per page at its `states` in plugin.json.
export function missingStateDiagnostics(
  manifest: SourceFile,
  parsed: PluginManifest,
): PluginDiagnostic[] {
  return draftPages(parsed.contributes.drafts).flatMap(
    ({ page, states }, index) => {
      const missing = missingDraftStates(states);

      if (!missing.length) return [];

      const names = missing.join(', ');

      return [
        sourceDiagnostic(
          manifest,
          draftOffset(manifest, [index, 'states']),
          `Draft page ${page} is missing states: ${names}`,
        ),
      ];
    },
  );
}

const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

/*
 * A Draft never ships (ADR-0057): each region that still declares Variants blocks a ship, one diagnostic
 * per region at its `variants` in plugin.json. `validate` reports them without failing, as a Plugin
 * mid-Draft is valid; `validate --ship` fails on them.
 */
export function shipBlockerDiagnostics(
  manifest: SourceFile,
  parsed: PluginManifest,
): PluginDiagnostic[] {
  return draftPages(parsed.contributes.drafts).flatMap(
    ({ page, regions }, pageIndex) =>
      (regions ?? []).map(({ id, variants }, regionIndex) => {
        const names = variants.map((variant) => variant.id).join(', ');

        return sourceDiagnostic(
          manifest,
          draftOffset(manifest, [
            pageIndex,
            'regions',
            regionIndex,
            'variants',
          ]),
          `Draft page ${page} region ${id} still declares ${plural(variants.length, 'Variant')}: ${names}; build the real page from the chosen ones, then delete the declarations`,
        );
      }),
  );
}

export async function draftManifestDiagnostics(
  directory: string,
  manifest: PluginManifest,
): Promise<{
  diagnostics: PluginDiagnostic[];
  shipBlockers: PluginDiagnostic[];
}> {
  if (!draftPages(manifest.contributes.drafts).length)
    return { diagnostics: [], shipBlockers: [] };

  const file = join(directory, 'plugin.json');
  const source = await readFile(file, 'utf8').catch(() => '');
  const input = { file, source };

  return {
    diagnostics: missingStateDiagnostics(input, manifest),
    shipBlockers: shipBlockerDiagnostics(input, manifest),
  };
}
