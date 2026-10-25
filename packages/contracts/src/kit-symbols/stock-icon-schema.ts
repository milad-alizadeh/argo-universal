import { z } from 'zod';
import { kitSchemaJson } from '../kit-schema-json';
import { iconSymbols, isIconName, type IconName } from './icon-map';

type IconEntry<Name extends IconName> = (typeof iconSymbols)[Name];

// An icon the phones draw as a symbol: an SF Symbol (Argo's own included) and a Material Symbol, never an SVG.
export type StockIconName = {
  [Name in IconName]: IconEntry<Name> extends { svg: string } ? never : Name;
}[IconName];

export function isStockIconName(name: string): name is StockIconName {
  if (!isIconName(name)) return false;

  const entry = iconSymbols[name];

  return 'sf' in entry;
}

const stockIconNames = Object.keys(iconSymbols).filter(isStockIconName);

export const stockIcon = z
  .custom<StockIconName>(
    (value) => typeof value === 'string' && isStockIconName(value),
  )
  .register(kitSchemaJson, { type: 'string', enum: stockIconNames });
