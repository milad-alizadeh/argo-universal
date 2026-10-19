import type { z } from 'zod';
import type { WithPropHints } from './kit-prop-hints';
import type { pluginPartSchemas } from './plugins/plugin-part-schemas';
import type { WireSchemaHints } from './plugins/plugin-prop-descriptions.gen';

export type KitPart = keyof typeof pluginPartSchemas;

export type { KitListItem, KitNode } from './plugins/list-expansion';

export type { KitChoiceValue } from './plugins/selection-value';

type DeclaredProps<Props> = Props extends object
  ? {
      [Key in keyof Props as string extends Key ? never : Key]: Props[Key];
    }
  : Props;

type Expansion<Part> = Part extends {
  expansion: infer Schema extends z.ZodType;
}
  ? z.output<Schema>
  : Record<never, never>;

export type KitSchemaProps = {
  [Name in KitPart]: WithPropHints<
    DeclaredProps<z.output<(typeof pluginPartSchemas)[Name]['props']>> &
      Expansion<(typeof pluginPartSchemas)[Name]>,
    Name extends keyof WireSchemaHints
      ? WireSchemaHints[Name]
      : Record<never, never>
  >;
};

export type KitEvents<Name extends KitPart> = {
  [Event in keyof (typeof pluginPartSchemas)[Name]['events']]: {
    payload: z.output<
      Extract<(typeof pluginPartSchemas)[Name]['events'][Event], z.ZodType>
    >;
    empty: Extract<
      (typeof pluginPartSchemas)[Name]['events'][Event],
      z.ZodType
    > extends z.ZodUndefined
      ? true
      : false;
  };
};

export type KitSlots<Name extends KitPart> =
  keyof (typeof pluginPartSchemas)[Name]['slots'];

// A part takes children when `children` is true or a list of part types.
export type KitHasChildren<Name extends KitPart> =
  (typeof pluginPartSchemas)[Name]['children'] extends false ? false : true;
