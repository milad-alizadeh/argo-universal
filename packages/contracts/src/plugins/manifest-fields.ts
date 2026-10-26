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

// A page path inside the Plugin, as its nav items and Slot actions name it.
export const PluginPath = z
  .string()
  .regex(/^\/(?:[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)?$/);
