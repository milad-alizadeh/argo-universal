import { z } from 'zod';
import { materialSymbolNames } from './material-symbol-names.gen';
import { sfSymbolNames } from './sf-symbol-names.gen';

const PluginIdentifier = z.string().regex(/^[a-z][a-z0-9-]*$/);

// Zod's default enum error would print every name in the list.
const notIn =
  (catalogue: string) =>
  ({ input }: { input: unknown }): string =>
    `${String(input)} is not in ${catalogue}`;

const sfSymbol = z.enum(sfSymbolNames, { error: notIn('SF Symbols 6.0') });

const materialSymbol = z.enum(materialSymbolNames, {
  error: notIn('Material Symbols'),
});

// A Plugin targets iOS and macOS, Android and the web, or both, so either name may be missing (ADR-0025).
export const PluginIcon = z
  .strictObject({
    sf: sfSymbol.optional(),
    sfFilled: sfSymbol.optional(),
    material: materialSymbol.optional(),
  })
  .refine(
    (icon) => icon.sf !== undefined || icon.material !== undefined,
    'icon needs an sf or a material name',
  )
  .refine(
    (icon) => icon.sfFilled === undefined || icon.sf !== undefined,
    'icon.sfFilled needs an sf name',
  );

export type PluginIcon = z.infer<typeof PluginIcon>;

const PluginPath = z
  .string()
  .regex(/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/);

export const PluginManifest = z.strictObject({
  id: PluginIdentifier,
  name: z.string().trim().min(1),
  version: z.string().min(1),
  engines: z.strictObject({ argo: z.string().trim().min(1) }),
  main: z
    .string()
    .regex(
      /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+\.(?:js|mjs|cjs)$/,
    ),
  icon: PluginIcon,
  contributes: z.strictObject({
    nav: z
      .array(
        z.strictObject({
          id: PluginIdentifier,
          title: z.string().trim().min(1),
          path: PluginPath,
        }),
      )
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        'Nav ids must be unique',
      ),
  }),
});

export type PluginManifest = z.infer<typeof PluginManifest>;

export const PluginList = z.object({
  plugins: z.array(
    z.object({
      manifest: PluginManifest,
      firstParty: z.boolean(),
      enabled: z.boolean(),
    }),
  ),
  errors: z.array(z.object({ directory: z.string(), message: z.string() })),
});

export type PluginList = z.infer<typeof PluginList>;
