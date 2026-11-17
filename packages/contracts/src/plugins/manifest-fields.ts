import { z } from 'zod';
import { materialSymbolNames } from '#plugin-material-symbol-names';
import { sfSymbolNames } from '#plugin-sf-symbol-names';

// Zod's default enum error would print every name in the list.
const notIn =
  (catalogue: string) =>
  ({ input }: { input: unknown }): string =>
    `${String(input)} is not in ${catalogue}`;

const sfSymbol = z.enum(sfSymbolNames, { error: notIn('SF Symbols 6.0') });

const materialSymbol = z.enum(materialSymbolNames, {
  error: notIn('Material Symbols'),
});

const symbolNames = {
  sf: sfSymbol.optional(),
  sfFilled: sfSymbol.optional(),
  material: materialSymbol.optional(),
};

const sfFilledNeedsSf = <Icon extends { sf?: unknown; sfFilled?: unknown }>(
  icon: Icon,
): boolean => icon.sfFilled === undefined || icon.sf !== undefined;

// A Plugin targets iOS and macOS, Android and the web, or both, so either name may be missing (ADR-0025).
export const PluginIcon = z
  .strictObject(symbolNames)
  .refine(
    (icon) => icon.sf !== undefined || icon.material !== undefined,
    'icon needs an sf or a material name',
  )
  .refine(sfFilledNeedsSf, 'icon.sfFilled needs an sf name');

// An SVG file inside the Plugin's folder, as `main` names its entry.
const pluginSvgFile = z
  .string()
  .regex(
    /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+\.svg$/,
    "icon.svg must be an .svg file inside the Plugin's folder",
  );

/*
 * The Plugin's icon in its manifest (ADR-0058): the SF and Material names every Plugin gives, as ADR-0025 asks, and
 * optionally an SVG file of its own, a one-colour mark the rail and the drawer draw in their place.
 */
export const ManifestIcon = z
  .strictObject({ ...symbolNames, svg: pluginSvgFile.optional() })
  .refine(
    (icon) => icon.sf !== undefined || icon.material !== undefined,
    'icon needs an sf or a material name',
  )
  .refine(sfFilledNeedsSf, 'icon.sfFilled needs an sf name');

export type ManifestIcon = z.infer<typeof ManifestIcon>;

export type PluginIcon = z.infer<typeof PluginIcon>;

// A page path inside the Plugin, as its nav items and Slot actions name it.
export const PluginPath = z
  .string()
  .regex(/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/);

// A Background pass or a Watch (ADR-0050, ADR-0055): the page or function at `path`, run for each Project every `interval` ms.
export const PluginPass = z.strictObject({
  path: PluginPath,
  interval: z.number().finite().nonnegative(),
});

// The most characters a Plugin's instructions file may hold, so the prose every Session carries stays short.
export const pluginInstructionsLimit = 1_000;

// The Markdown file of Plugin instructions, named relative to the Plugin's folder.
export const InstructionsFile = z
  .string()
  .regex(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+\.md$/);
