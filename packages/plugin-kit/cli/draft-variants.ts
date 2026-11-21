import { join } from 'node:path';
import type { PluginManifest } from '@repo/contracts/plugins';
import { draftVariantKey } from '@repo/contracts/plugins/drafts';
import { findWireNodeEntry } from '@repo/contracts/plugins/wire-node-key';
import type { PluginValidation } from '@repo/engine/plugin-validation';
import { startPluginTest } from '../testing';

type Diagnostics = PluginValidation['diagnostics'];

type Draw = { page: string; region: string; variant: string };

// A page pattern's `:name` segments draw with a stand-in value, as a Draft's canned data does not read them.
const pathOf = (page: string): string => page.replace(/:[^/]+/g, 'draft');

const drawsOf = (manifest: PluginManifest): Draw[] =>
  (manifest.contributes.drafts ?? []).flatMap(({ page, regions }) =>
    (regions ?? []).flatMap(({ id, variants }) =>
      variants.map((variant) => ({ page, region: id, variant: variant.id })),
    ),
  );

/*
 * `validate` refuses a Variant that does not render (ADR-0057): each Variant of each region is drawn on its own
 * page, as the App draws it once picked, and a Render that throws, or a region whose node is missing because the kit refused it, is the diagnostic.
 * A Plugin that declares no regions starts nothing.
 */
export async function variantDiagnostics(
  directory: string,
  manifest: PluginManifest,
): Promise<Diagnostics> {
  const draws = drawsOf(manifest);

  if (!draws.length) return [];

  const kit = await startPluginTest({
    directory,
    pluginId: manifest.id,
    version: '0.0.0',
    clockStart: 0,
    projects: [{ id: 'test-project', name: 'Test', originUrl: null }],
  });

  try {
    return await refusals(kit, directory, draws);
  } finally {
    await kit.close();
  }
}

async function refusals(
  kit: Awaited<ReturnType<typeof startPluginTest>>,
  directory: string,
  draws: Draw[],
): Promise<Diagnostics> {
  const found: Diagnostics = [];

  for (const { page, region, variant } of draws) {
    const why = await refusal(kit, page, { region, variant });

    if (why)
      found.push({
        file: join(directory, 'plugin.json'),
        line: 1,
        column: 1,
        message: `Draft ${page}: Variant ${variant} of region ${region} does not render: ${why}`,
      });
  }

  return found;
}

async function refusal(
  kit: Awaited<ReturnType<typeof startPluginTest>>,
  page: string,
  pick: { region: string; variant: string },
): Promise<string | null> {
  try {
    const opened = await kit.pages.open({
      path: pathOf(page),
      pageState: { [draftVariantKey(pick.region)]: pick.variant },
    });

    // A node the kit refused is dropped from the tree, so a region with no node of its key drew nothing.
    return findWireNodeEntry(opened.tree, ({ key }) => key === pick.region)
      ? null
      : `it draws no node keyed ${pick.region}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
