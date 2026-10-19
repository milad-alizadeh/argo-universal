import { z } from 'zod';
import { kitSchemaJson } from '../kit-schema-json';
import { materialSymbolNames } from '../plugins/material-symbol-names.gen';
import { sfSymbolNames } from '../plugins/sf-symbol-names.gen';
import { iconNames, isIconName, type IconName } from './icon-map';
import { iconRoles, type IconRole } from './icon-role';

export const iconName = z
  .custom<IconName>((value) => typeof value === 'string' && isIconName(value))
  .register(kitSchemaJson, { type: 'string', enum: [...iconNames] });

export const iconRole = z
  .custom<IconRole>(
    (value) => typeof value === 'string' && Object.hasOwn(iconRoles, value),
  )
  .register(kitSchemaJson, { type: 'string', enum: Object.keys(iconRoles) });

const appleSymbol = z.union([z.enum(sfSymbolNames), z.literal('custom.robot')]);

export const systemSymbolSource = z.object({
  sf: appleSymbol,
  sfFilled: appleSymbol.optional(),
  material: z.enum(materialSymbolNames),
});

export const iconSymbol = z.union([iconName, systemSymbolSource]);

export type SystemSymbolSource = z.output<typeof systemSymbolSource>;

export type IconSymbol = z.output<typeof iconSymbol>;
