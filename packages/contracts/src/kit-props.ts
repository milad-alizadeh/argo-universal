import type { z } from 'zod';
import type { WithPropHints } from './kit-prop-hints';
import type { pluginPartSchemas } from './plugins/plugin-part-schemas';
import type { WireSchemaHints } from './plugins/plugin-prop-descriptions.gen';

export type KitPart = keyof typeof pluginPartSchemas;

export type { KitChoiceValue } from './plugins/selection-value';

export type KitSchemaProps = {
  [Name in KitPart]: WithPropHints<
    z.output<(typeof pluginPartSchemas)[Name]['props']>,
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

export type KitHasChildren<Name extends KitPart> =
  (typeof pluginPartSchemas)[Name]['children'];
