import { z } from 'zod';
import {
  buttonSizes,
  buttonVariants,
  stackAlignments,
  isStackGap,
  type StackGap,
  textRoles,
  tones,
} from '../kit-tokens';
import { Handler } from './wire';

const textV1 = z.object({
  label: z.string(),
  variant: z.enum(textRoles).optional(),
  tone: z.enum(tones).optional(),
});

export const textProps = textV1.extend({
  accessibilityLabel: z.string().optional(),
});

export const buttonProps = z.object({
  label: z.string(),
  variant: z.enum(buttonVariants).optional(),
  tone: z.literal('danger').optional(),
  size: z.enum(buttonSizes).optional(),
  disabled: z.boolean().optional(),
  onPress: Handler.optional(),
});

export const layoutProps = z.object({
  gap: z
    .custom<StackGap>((value) => typeof value === 'number' && isStackGap(value))
    .optional(),
  align: z.enum(stackAlignments).optional(),
});

export const groupedItemProps = z.object({ label: z.string(), value: z.string().optional(), disabled: z.boolean().optional(), onPress: Handler.optional() });

const listProps = z.object({});

export const listPartNames = ['VirtualList', 'Table', 'GroupedList'] as const;

const contentParts = ['Text', 'Button', 'Stack', 'Row', 'Column', 'GroupedListItem'] as const;

export const stackProps = layoutProps.extend({
  direction: z.enum(['row', 'column']),
});

// Append a schema when a part changes; old versions keep their original props.
export const wireParts = {
  GroupedListItem: { props: groupedItemProps, versions: [groupedItemProps], container: true, slots: { leading: contentParts, accessories: contentParts, footer: contentParts, detail: contentParts }, events: { onPress: z.undefined() } },
  VirtualList: { props: listProps, versions: [listProps], container: true, slots: {}, events: {} },
  Table: { props: listProps, versions: [listProps], container: true, slots: {}, events: {} },
  GroupedList: { props: listProps, versions: [listProps], container: true, slots: {}, events: {} },
  Text: {
    props: textProps,
    versions: [textV1, textProps],
    container: false,
    slots: {},
    events: {},
  },
  Button: {
    props: buttonProps,
    versions: [buttonProps],
    container: false,
    slots: {},
    events: { onPress: z.undefined() },
  },
  Stack: {
    props: stackProps,
    versions: [stackProps],
    container: true,
    slots: {},
    events: {},
  },
  Row: {
    props: layoutProps,
    versions: [layoutProps],
    container: true,
    slots: {},
    events: {},
  },
  Column: {
    props: layoutProps,
    versions: [layoutProps],
    container: true,
    slots: {},
    events: {},
  },
} as const;

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
