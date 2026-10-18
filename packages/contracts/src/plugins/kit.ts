import { z } from 'zod';
import { wireParts } from './wire-parts';

export { wireParts, listPartNames } from './wire-parts';

export {
  listProps,
  contentListProps,
  listSectionProps,
  listItemProps,
  labelProps,
  progressBarProps,
  pillProps,
  textProps,
  buttonProps,
  layoutProps,
  stackProps,
  groupedItemProps,
  svgProps,
  emptyStateProps,
} from './kit-props';

export type WirePart = keyof typeof wireParts;

export type WireProps = {
  [Name in WirePart]: z.output<(typeof wireParts)[Name]['props']>;
};

const partsByType = new Map(Object.entries(wireParts));

export function wirePart(
  type: string,
): (typeof wireParts)[WirePart] | undefined {
  return partsByType.get(type);
}

export const PartVersions = z.record(
  z.string().min(1),
  z.number().int().positive(),
);

export type PartVersions = z.infer<typeof PartVersions>;

export const PluginSurface = z.object({
  platform: z.enum(['ios', 'android', 'web', 'desktop']),
  parts: PartVersions,
});

export type PluginSurface = z.infer<typeof PluginSurface>;

// Apps predating part reports draw the original four parts.
export const legacyPartVersions: PartVersions = {
  Text: 1,
  Button: 1,
  Row: 1,
  Column: 1,
};

export function versionsOf(types: readonly string[]): PartVersions {
  return Object.fromEntries(
    types.flatMap((type) => {
      const part = wirePart(type);

      return part ? [[type, part.versions.length]] : [];
    }),
  );
}

// Internal Server callers use the current wire; Apps negotiate their own part versions.
export const currentPartVersions = versionsOf(Object.keys(wireParts));
